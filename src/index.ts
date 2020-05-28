import * as pitft from 'pitft';
import * as gpio from 'rpi-gpio';

import * as os from 'os';
import * as osu from 'node-os-utils';

import * as prettyBytes from 'pretty-bytes';
import * as prettyMs from 'pretty-ms';

import { setBacklight, toggleBacklight } from './modules/backlight';
import { COLORS, hexToRgb } from './modules/colors';
import { cpuStats, networkSpeedStats, driveStats, memoryStats } from './modules/stats';
import { Renderer } from './modules/Renderer';
import { GraphDataSet, lineGraph } from './modules/graph';

const REFRESH_INTERVAL = 250; //ms

const GPIO_VOUT = 37;
const GPIO_BUTTON_A = 33;
const GPIO_BUTTON_B = 35;

const gpioButtons = [GPIO_BUTTON_A, GPIO_BUTTON_B];

gpio.setMode(gpio.MODE_RPI);
gpio.setup(GPIO_VOUT, gpio.DIR_HIGH);
gpioButtons.map(n => gpio.setup(n, gpio.DIR_IN, gpio.EDGE_FALLING, e => { throw e; }));

// Returns a framebuffer in double buffering mode
const renderer = new Renderer(pitft("/dev/fb1", true));

// Clear the screen buffer
renderer.clear();

const width = renderer.size().width; // 320
const height = renderer.size().height; // 240
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
            
            renderer.color(...hexToRgb(textColor));
            renderer.font(fontFamily, fontSize);
            renderer.text(0, baseline, s, false, 0);
            
            // increment our y cursor
            y += lineHeight;
        };

        const addDivider = (lineStroke = 1, padding = getLineGeometry().padding, color = COLORS.darkGray) => {
            const divderColor = hexToRgb(COLORS.darkGray);
            
            y += padding;
            
            renderer.color(...divderColor);
            renderer.line(0, y, width, y, lineStroke);

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
            renderer.color(...hexToRgb(COLORS.lightGray));
            renderer.rect(0, y, width, lineHeight);

            // draw the bar at the height of the text and pad all four sides
            renderer.color(...hexToRgb(barColor));
            renderer.rect(padding, y + padding, Math.ceil(pct * (width - padding)), fontSize);

            // increment our y cursor
            y += lineHeight;
        }

        // Clear the screen buffer
        renderer.clear();

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
        
        const colSplit = Math.floor(width / 2);
        const graphHeight = 70;
        
        const cpuGraphDataSets: GraphDataSet[] = [{
            label: '1 min',
            values: cpuStats.data.map(datum => datum.value[0])
        },{
            label: '5 min',
            values: cpuStats.data.map(datum => datum.value[1])
        },{
            label: '15 min',
            values: cpuStats.data.map(datum => datum.value[2])
        }];
        lineGraph(cpuGraphDataSets, renderer, {
            offsetY: y,
            height: graphHeight,
            width: colSplit,
            title: 'CPU Load',
            horizontalSpacing: 2,
            titleHeight: 12,
            labelHeight: 10
        });

        const networkSpeedDataSets = Object.keys(networkSpeedStats).reduce((graphData: GraphDataSet[], ifname) => {
            graphData.push({
                label: `${ifname}: in`,
                values: networkSpeedStats[ifname].data.map(datum => datum.value.inputBytes)
            });
            graphData.push({
                label: `${ifname}: out`,
                values: networkSpeedStats[ifname].data.map(datum => datum.value.outputBytes)
            });
            return graphData;
        }, []);
            
        lineGraph(networkSpeedDataSets, renderer, {
            offsetY: y,
            offsetX: colSplit + 1,
            height: graphHeight,
            width: colSplit,
            title: 'Network Speeds',
            horizontalSpacing: 2,
            titleHeight: 12,
            labelHeight: 10
        });

        // end of row, move cursor down
        y += graphHeight;

        const diskUsageDataSets = [{
            label: 'Used Gb',
            values: driveStats.data.map(datum => datum.value.usedGb)
        }, {
            label: 'Free Gb',
            values: driveStats.data.map(datum => datum.value.freeGb)
        }, {
            label: 'Total Gb',
            values: driveStats.data.map(datum => datum.value.totalGb)
        }]
        lineGraph(diskUsageDataSets, renderer, {
            offsetY: y,
            height: graphHeight,
            width: colSplit,
            title: 'Disk Usage',
            horizontalSpacing: 2,
            titleHeight: 12,
            labelHeight: 10
        });

        const memoryUsageDataSets = [{
            label: 'Used Bytes',
            values: memoryStats.data.map(datum => datum.value.usedBytes)
        }, {
            label: 'Free Bytes',
            values: memoryStats.data.map(datum => datum.value.freeBytes)
        }, {
            label: 'Total Bytes',
            values: memoryStats.data.map(datum => datum.value.totalBytes)
        }]
        lineGraph(memoryUsageDataSets, renderer, {
            offsetY: y,
            offsetX: colSplit + 1,
            height: graphHeight,
            width: colSplit,
            title: 'Memory Usage',
            horizontalSpacing: 2,
            titleHeight: 12,
            labelHeight: 10
        });
            
        // Transfer the back buffer to the screen buffer
        setTimeout(() => renderer.blit(), 20);
        
        // trigger another update
        setTimeout(updateDisplay, REFRESH_INTERVAL);
    });
};

// turn the backlight on at startup
setBacklight(true);

onButtonPress(GPIO_BUTTON_A, () => toggleBacklight());
// onButtonPress(GPIO_BUTTON_B, () => console.log('button b, gpio 35'));

updateDisplay();