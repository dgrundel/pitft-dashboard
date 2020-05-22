var pitft = require('pitft');
var os = require('os');
var ifaces = os.networkInterfaces();

const fontFamily = 'noto';
const fontSize = 16;

const getIpAddresses = () => Object.keys(ifaces).reduce((ips, ifname) => {
    return ips.concat(ifaces[ifname]
        .filter(iface => iface.family === 'IPv4' && iface.internal === false)
        .map(iface => iface.address));
}, []);

const getDateString = () => {
    const now = new Date();
    return now.toISOString();
}

// Returns a framebuffer in double buffering mode
var fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

var xMax = fb.size().width;
var yMax = fb.size().height;

fb.color(1, 1, 1); // Set the color to white

fb.font(fontFamily, fontSize);

var update = function() {
    // Draw the text non-centered, non-rotated, left
    fb.text(0, 20, getIpAddresses().join(', '), false, 0);
    fb.text(20, 20, getDateString(), false, 0);

    fb.blit(); // Transfer the back buffer to the screen buffer
};

setInterval(function() {
    update();
}, 100);
