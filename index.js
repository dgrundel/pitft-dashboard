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
    const time = `${hour % 12}:${pad(now.getMinutes())}:${now.getSeconds()} ${ampm}`;
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

const getDiskUsageStr = (info) => osu.isNotSupported(info)
    ? 'Unsupported'
    : `${info.freeGb}GB Free, ${info.usedPercentage}% Used`;

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

const width = fb.size().width;
const height = fb.size().height;

const updateDisplay = function() {
    osu.drive.info().then(diskInfo => {
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
        fb.text(0, 145, `Disk: ${getDiskUsageStr(diskInfo)}`, false, 0);

        
        fb.color(1, 1, 1);
        fb.rect(0, 168, width, 24, true, 1); // Draw an outlined rectangle with a 1 pixel wide border
        fb.color(0, 1, 0);
        fb.rect(0, 170, Math.floor((diskInfo.usedPercentage / 100) * width), 20, false, 0); // Draw a filled rectangle
        
        
        // Transfer the back buffer to the screen buffer
        fb.blit(); 
        
        // trigger another update
        setTimeout(updateDisplay, 100);
    });
};

updateDisplay();
