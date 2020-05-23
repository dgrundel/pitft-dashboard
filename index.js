const pitft = require('pitft');
const os = require('os');
const osu = require('node-os-utils');
const humanSize = require('human-size');
const prettyMs = require('pretty-ms');
const ifaces = os.networkInterfaces();

const fontFamily = 'robot';
const fontSize = 16;

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
    const time = `${hour % 12}:${pag(now.getMinutes())}:${now.getSeconds()} ${ampm}`;
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

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

// const xMax = fb.size().width;
// const yMax = fb.size().height;

const updateDisplay = function() {
    // Clear the screen buffer
    fb.clear();

    // Set the foreground color to white
    fb.color(1, 1, 1); 
    fb.font(fontFamily, fontSize);

    // Draw the text non-centered, non-rotated, left (omitted arg)
    fb.text(0, 20, `IP: ${getIpAddresses().join(', ')}`, false, 0);
    fb.text(0, 45, `Date: ${getDateString()}`, false, 0);
    fb.text(0, 70, `Uptime: ${getUptimeString()}`, false, 0);
    fb.text(0, 95, `Load: ${getLoadString()}`, false, 0);
    fb.text(0, 120, `Memory: ${getMemoryUsageString()}`, false, 0);

    osu.drive.info().then(info => {
        const usageStr = osu.isNotSupported(info)
            ? 'Unsupported'
            : `${info.freeGb}GB Free, ${info.usedPercentage}% Used`;

        fb.text(0, 145, `Disk: ${usageStr}`, false, 0);

    }).then(() => {
        // Transfer the back buffer to the screen buffer
        fb.blit(); 
        
        // trigger another update
        setTimeout(updateDisplay, 100);
    })

};

updateDisplay();
