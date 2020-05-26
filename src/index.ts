import * as pitft from 'pitft';
import * as gpio from 'rpi-gpio';

import * as os from 'os';
import * as osu from 'node-os-utils';

import * as prettyBytes from 'pretty-bytes';
import * as prettyMs from 'pretty-ms';

import { setBacklight, toggleBacklight } from './modules/backlight';
import { COLORS, hexToRgb, GRAPH_COLORS } from './modules/colors';
import { cpuStats, CpuLoad } from './modules/stats/cpuStats';
import { Datum } from './modules/StatData';

const gpioOut = 37;
const gpioButtons = [33, 35];

gpio.setMode(gpio.MODE_RPI);
gpio.setup(gpioOut, gpio.DIR_HIGH);
gpioButtons.map(n => gpio.setup(n, gpio.DIR_IN, gpio.EDGE_FALLING, e => { throw e; }));

// Returns a framebuffer in double buffering mode
const fb = pitft("/dev/fb1", true);

// Clear the screen buffer
fb.clear();

const width = fb.size().width; // 320
const height = fb.size().height; // 240
const fontFamily = 'roboto';
const defaultFontSize = 18;
const defaultLineHeight = 22;

const onButtonPress = (id: number, callback: () => void) => {
    gpio.on('change', function(channel, value) {
        if (id === channel && value === false) {
            callback();
        }
    });
};

const pad = (n: number) => (n < 10 ? '0' : '') + n;

const getIpAddresses = () => Object.values(os.networkInterfaces())
    .reduce((ips: string[], ifaces: os.NetworkInterfaceInfo[]) => ips.concat(
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

    return `${prettyBytes(used)} / ${prettyBytes(total)}`;
};

const getMemoryUsagePercent = () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return used/total;
};

const getDiskUsageStr = (info: osu.DriveInfo) => osu.isNotSupported(info)
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
    osu.drive.info('/').then(diskInfo => {
        // vertical cursor
        let y = 0;

        const addTextLine = (s: string, sizeOverride: number = undefined, textColor = COLORS.lightGray) => {
            const { fontSize, lineHeight, padding } = getLineGeometry(sizeOverride);

            // place baseline of text with padding
            const baseline = y + lineHeight - padding;
            
            fb.color(...hexToRgb(textColor));
            fb.font(fontFamily, fontSize);
            fb.text(0, baseline, s, false, 0);
            
            // increment our y cursor
            y += lineHeight;
        };

        const addDivider = (lineStroke = 1, padding = getLineGeometry().padding, color = COLORS.darkGray) => {
            const divderColor = hexToRgb(COLORS.darkGray);
            
            y += padding;
            
            fb.color(...divderColor);
            fb.line(0, y, width, y, lineStroke);

            y += lineStroke + padding;
        };

        const addHorizontalGraph = (pct: number) => {
            const { fontSize, lineHeight, padding } = getLineGeometry();
            let barColor = COLORS.green;
            if (pct > .8) {
                barColor = COLORS.red;
            } else if (pct > .6) {
                barColor = COLORS.gold;
            }

            // draw a rectangle the full width of the screen and full line height
            fb.color(...hexToRgb(COLORS.lightGray));
            fb.rect(0, y, width, lineHeight);

            // draw the bar at the height of the text and pad all four sides
            fb.color(...hexToRgb(barColor));
            fb.rect(padding, y + padding, Math.ceil(pct * (width - padding)), fontSize);

            // increment our y cursor
            y += lineHeight;
        }

        const addLineGraph = (data: number[][], graphHeight = 40) => {
            const hPadding = 4;
            const lineStroke = 1;

            // draw axes
            fb.color(...hexToRgb(COLORS.darkGray));
            fb.line(hPadding, y, hPadding, y + graphHeight, lineStroke);
            fb.line(hPadding, y + graphHeight, width - hPadding, y + graphHeight, lineStroke);

            // how large is the largest set of data points?
            const maxLength = data.reduce((max, values) => Math.max(max, values.length), -Infinity);
            if (maxLength < 2) {
                return;
            }
            // how far to space points on graph
            const xStep = Math.floor((width - (hPadding * 2)) / (maxLength - 1));

            // draw vertical lines for where data points go
            for (let x = hPadding + xStep; x < width; x += xStep) {
                fb.color(...hexToRgb(COLORS.darkDarkGray));
                fb.line(x, y, x, y + graphHeight, lineStroke);
            }
            
            // calculate upper/lower bounds of all data points
            const maxValue = data.reduce((max, values) => Math.max(max, ...values), -Infinity);
            const minValue = data.reduce((min, values) => Math.min(min, ...values), Infinity);
            const range = maxValue - minValue;

            const calcY = (v: number) => {
                return y + Math.floor((1 - (Math.abs(v - minValue) / range)) * graphHeight);
            };

            // x cursor
            let x = hPadding;

            data.forEach((dataSet, dataSetIndex) => {
                // reset x cursor
                x = hPadding;
                
                // i starts at 1 to skip first value (we look back at it)
                for(let i = 1; i < dataSet.length; i++) {
                    const v1 = dataSet[i -1];
                    const v2 = dataSet[i];

                    const x1 = x;
                    const y1 = calcY(v1);
                    
                    const x2 = (x += xStep);
                    const y2 = calcY(v2);

                    fb.color(...hexToRgb(GRAPH_COLORS[dataSetIndex]));
                    fb.line(x1, y1, x2, y2, lineStroke);
                }
            });

            // increment our y cursor
            y += graphHeight;
        }

        // Clear the screen buffer
        fb.clear();

        // Draw the text non-centered, non-rotated, left (omitted arg)
        addTextLine(getDateString(), 24, COLORS.blue);
        addTextLine(`Uptime: ${getUptimeString()}`, 12, COLORS.darkGray);
        
        addTextLine(getIpAddresses().join(', '), 18, COLORS.green);
        
        addDivider(1, 10, COLORS.lightGray);

        // addTextLine(`Load: ${getLoadString()}`);
        // // 1 minute load avg
        // addHorizontalGraph(os.loadavg()[0]);
        
        // addTextLine(`Memory: ${getMemoryUsageString()}`);
        // addHorizontalGraph(getMemoryUsagePercent());

        // addTextLine(`Disk: ${getDiskUsageStr(diskInfo)}`);
        // addHorizontalGraph(parseFloat(diskInfo.usedPercentage.toString()) / 100);
        
        const lastStatPoint = cpuStats.data[cpuStats.data.length - 1];
        addTextLine(`cpuStats: ${cpuStats.data.length}, ${lastStatPoint.time}: ${lastStatPoint.value[0].toFixed(2)}`, 8, COLORS.gold);

        addLineGraph(cpuStats.data.reduce((all: number[][], point: Datum<CpuLoad>) => {
            all[0].push(point.value[0]);
            all[1].push(point.value[1]);
            all[2].push(point.value[2]);
            return all;
        }, [[], [], []]));
            
        // Transfer the back buffer to the screen buffer
        setTimeout(() => fb.blit(), 20);
        
        // trigger another update
        setTimeout(updateDisplay, 120);
    });
};

// turn the backlight on at startup
setBacklight(true);

onButtonPress(33, () => toggleBacklight());
// onButtonPress(35, () => gpioMessages.push('35'));

updateDisplay();