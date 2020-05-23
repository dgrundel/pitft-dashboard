const pitft = require('pitft');
const os = require('os');
const humanSize = require('human-size');
const ifaces = os.networkInterfaces();

const fontFamily = 'noto';
const fontSize = 16;

const getIpAddresses = () => Object.keys(ifaces).reduce((ips, ifname) => {
    return ips.concat(ifaces[ifname]
        .filter(iface => iface.family === 'IPv4' && iface.internal === false)
        .map(iface => iface.address));
}, []);

const getDateString = () => {
    const now = new Date();
    const hour = now.getHours();
    const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const ampm = hour > 12 ? 'pm' : 'am';
    const time = `${hour % 12}:${now.getMinutes()}:${now.getSeconds()} ${ampm}`;
    return `${date} ${time}`;
};

const getLoadStr = () => os.loadavg()
    .map(i => i.toFixed(2))
    .join(', ');

const getMemoryUsageStr = () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return `${humanSize(used, 2)} / ${humanSize(total, 2)}`;
};

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

const xMax = fb.size().width;
const yMax = fb.size().height;

const update = function() {
    // Clear the screen buffer
    fb.clear();

    fb.color(1, 1, 1); // Set the color to white
    fb.font(fontFamily, fontSize);

    // Draw the text non-centered, non-rotated, left (omitted arg)
    fb.text(0, 20, 'IP: ' + getIpAddresses().join(', '), false, 0);
    fb.text(0, 45, 'Date: ' + getDateString(), false, 0);
    fb.text(0, 70, 'Uptime: ' + os.uptime(), false, 0);
    fb.text(0, 95, 'Load: ' + getLoadStr(), false, 0);
    fb.text(0, 120, 'Memory: ' + getMemoryUsageStr(), false, 0);

    fb.blit(); // Transfer the back buffer to the screen buffer
};

setInterval(function() {
    update();
}, 100);
