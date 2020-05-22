var pitft = require('pitft');
var os = require('os');
var ifaces = os.networkInterfaces();

const fontFamily = 'noto';
const fontSize = 16;

const ipAddrs = Object.keys(ifaces).reduce((ips, ifname) => {
    return ips.concat(ifaces[ifname]
        .filter(iface => iface.family === 'IPv4' && iface.internal === false)
        .map(iface => iface.address));
}, []);

// Returns a framebuffer in direct mode
var fb = pitft('/dev/fb1'); 

// Clear the screen buffer
fb.clear();

var xMax = fb.size().width;
var yMax = fb.size().height;

fb.color(1, 1, 1); // Set the color to white

fb.font(fontFamily, fontSize);
// Draw the text non-centered, non-rotated, left
fb.text(0, 20, ipAddrs.join(', '), false, 0);