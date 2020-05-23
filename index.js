const pitft = require('pitft');
const os = require('os');
const osu = require('node-os-utils');
const humanSize = require('human-size');
const prettyMs = require('pretty-ms');
const ifaces = os.networkInterfaces();

const getIpAddresses = () => Object.keys(ifaces).reduce((ips, ifname) => {
    return ips.concat(ifaces[ifname]
        .filter(iface => iface.family === 'IPv4' && iface.internal === false)
        .map(iface => iface.address));
}, []);

const pad = (n) => (n < 10 ? '0' : '') + n;

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

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

const width = fb.size().width; // 320
const height = fb.size().height; // 240
const fontFamily = 'robot';
const fontSize = 16;
const lineHeight = 20;
const padding = (lineHeight - fontSize) / 2;

const updateDisplay = () => {
    osu.drive.info().then(diskInfo => {
        // vertical cursor
        let y = 0;

        const addTextLine = (s) => {
            // place baseline of text with padding
            const baseline = y + lineHeight - padding;
            
            fb.color(1, 1, 1);
            fb.text(0, baseline, s, false, 0);
            
            // increment our y cursor
            y += lineHeight;
        };

        const addGraph = (pct) => {
            // draw a rectangle the full width of the screen and full line height
            fb.color(1, 1, 1);
            fb.rect(0, y, width, lineHeight);

            // draw the bar at the height of the text and pad all four sides
            fb.color(0, 1, 0);
            fb.rect(padding, y + padding, Math.ceil(pct * (width - padding)), fontSize);

            // increment our y cursor
            y += lineHeight;
        }

        // Clear the screen buffer
        fb.clear();

        // Set the foreground color to white
        fb.color(1, 1, 1); 
        fb.font(fontFamily, fontSize);

        // Draw the text non-centered, non-rotated, left (omitted arg)
        addTextLine(`IP: ${getIpAddresses().join(', ')}`);
        addTextLine(`Date: ${getDateString()}`);
        addTextLine(`Uptime: ${getUptimeString()}`);
        addTextLine(`Load: ${getLoadString()}`);
        
        addTextLine(`Memory: ${getMemoryUsageString()}`);
        addGraph(getMemoryUsagePercent());

        addTextLine(`Disk: ${getDiskUsageStr(diskInfo)}`);
        addGraph(parseFloat(diskInfo.usedPercentage) / 100);
        
        // Transfer the back buffer to the screen buffer
        fb.blit(); 
        
        // trigger another update
        setTimeout(updateDisplay, 100);
    });
};

updateDisplay();
