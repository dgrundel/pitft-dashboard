const pitft = require('pitft');
const gpio = require('rpi-gpio');

const fs = require('fs');
const os = require('os');
const osu = require('node-os-utils');

const humanSize = require('human-size');
const prettyMs = require('pretty-ms');

const sysFsBacklightPath = '/sys/class/backlight/soc\:backlight/brightness';
let backlightEnabled = true;

const gpioOut = 37;
const gpioButtons = [33, 35];
const gpioMessages = [];

gpio.setMode(gpio.MODE_RPI);
// gpio.on('change', function(channel, value) {
//     gpioMessages.push(`${channel}: ${value}`);
// });
gpio.setup(gpioOut, gpio.DIR_HIGH);
gpioButtons.map(n => gpio.setup(n, gpio.DIR_IN, gpio.EDGE_FALLING, e => e ? gpioMessages.push(e.message): 0));

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

const width = fb.size().width; // 320
const height = fb.size().height; // 240
const fontFamily = 'roboto';
const defaultFontSize = 18;
const defaultLineHeight = 22;
const colors = {
    blue: '035aa6',
    darkGray: '888888',
    darkGreen: '06623b',
    gold: 'f5a31a',
    green: '79d70f',
    lightGray: 'edf4f2',
    purple: '4d089a',
    red: 'd32626'
};

const toggleBacklight = (enable) => {
    backlightEnabled = enable === true;
    fs.writeFileSync(sysFsBacklightPath, backlightEnabled ? '1' : '0');
}

const onButtonPress = (id, callback) => {
    gpio.on('change', function(channel, value) {
        if (id === channel && value === false) {
            callback();
        }
    });
};

const hexToRgb = (hexStr) => [
    parseInt(hexStr.substring(0, 2), 16) / 255,
    parseInt(hexStr.substring(2, 4), 16) / 255,
    parseInt(hexStr.substring(4), 16) / 255
];

const pad = (n) => (n < 10 ? '0' : '') + n;

const getIpAddresses = () => (Object.values(os.networkInterfaces()) as any[])
    .reduce((ips, ifaces) => ips.concat(
            ifaces.filter(iface => iface.family === 'IPv4' && iface.internal === false)
                .map(iface => iface.address)
        ),
        []
    );

const getDateString = () => {
    const now = new Date();
    const hour = now.getHours();
    const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const ampm = hour > 12 ? 'pm' : 'am';
    const time = `${hour % 12}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
    return `${date} ${time}`;
};

// uptime is in seconds, prettyMilliseconds uses millis
const getUptimeString = () => prettyMs(os.uptime() * 1000);

const getLoadString = () => os.loadavg()
    .map(i => i.toFixed(2))
    .join(', ');

const getMemoryUsageString = () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return `${humanSize(used, 2)} / ${humanSize(total, 2)}`;
};

const getMemoryUsagePercent = () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return used/total;
};

const getDiskUsageStr = (info) => osu.isNotSupported(info)
    ? 'Unsupported'
    : `${info.freeGb}GB Free, ${info.usedPercentage}% Used`;

const getLineGeometry = (fontSize = defaultFontSize) => {
    const lineHeight = Math.max(fontSize, defaultLineHeight);
    const padding = (lineHeight - fontSize) / 2;

    return {
        fontSize,
        lineHeight,
        padding
    };
};

const updateDisplay = () => {
    osu.drive.info().then(diskInfo => {
        // vertical cursor
        let y = 0;

        const addTextLine = (s, sizeOverride = undefined, textColor = colors.lightGray) => {
            const { fontSize, lineHeight, padding } = getLineGeometry(sizeOverride);

            // place baseline of text with padding
            const baseline = y + lineHeight - padding;
            
            fb.color(...hexToRgb(textColor));
            fb.font(fontFamily, fontSize);
            fb.text(0, baseline, s, false, 0);
            
            // increment our y cursor
            y += lineHeight;
        };

        const addDivider = (thickness = 1, padding = getLineGeometry().padding, color = colors.darkGray) => {
            const divderColor = hexToRgb(colors.darkGray);
            
            y += padding;
            
            fb.color(...divderColor);
            fb.line(0, y, width, y, thickness, ...divderColor);

            y += thickness + padding;
        };

        const addGraph = (pct) => {
            const { fontSize, lineHeight, padding } = getLineGeometry();
            let barColor = colors.green;
            if (pct > .8) {
                barColor = colors.red;
            } else if (pct > .6) {
                barColor = colors.gold;
            }

            // draw a rectangle the full width of the screen and full line height
            fb.color(...hexToRgb(colors.lightGray));
            fb.rect(0, y, width, lineHeight);

            // draw the bar at the height of the text and pad all four sides
            fb.color(...hexToRgb(barColor));
            fb.rect(padding, y + padding, Math.ceil(pct * (width - padding)), fontSize);

            // increment our y cursor
            y += lineHeight;
        }

        // Clear the screen buffer
        fb.clear();

        // Draw the text non-centered, non-rotated, left (omitted arg)
        addTextLine(getDateString(), 24, colors.blue);
        addTextLine(`Uptime: ${getUptimeString()}`, 12, colors.darkGray);
        
        addTextLine(getIpAddresses().join(', '), 18, colors.green);
        
        addDivider(1, 10, colors.lightGray);

        addTextLine(`Load: ${getLoadString()}`);
        // 1 minute load avg
        addGraph(os.loadavg()[0]);
        
        addTextLine(`Memory: ${getMemoryUsageString()}`);
        addGraph(getMemoryUsagePercent());

        addTextLine(`Disk: ${getDiskUsageStr(diskInfo)}`);
        addGraph(parseFloat(diskInfo.usedPercentage) / 100);
        
        addTextLine(gpioMessages.join('; '), 8, colors.gold);
            
        // Transfer the back buffer to the screen buffer
        setTimeout(() => fb.blit(), 20);
        
        // trigger another update
        setTimeout(updateDisplay, 120);
    });
};

onButtonPress(33, () => toggleBacklight(!backlightEnabled));
onButtonPress(35, () => gpioMessages.push('35'));

toggleBacklight(true);
updateDisplay();