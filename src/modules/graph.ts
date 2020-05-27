import { Renderer } from "./Renderer";
import { COLORS, hexToRgb, RGBColor } from "./colors";

const DEFAULT_LINE_STROKE = 1;
const DEFAULT_HSPACING = 2;
const DEFAULT_TITLE_HEIGHT = 12;
const DEFAULT_LABEL_HEIGHT = 10;
const DEFAULT_FONT_FAMILY = 'roboto';
const DEFAULT_TITLE_COLOR = COLORS.lightGray;
const DEFAULT_VLINE_COLOR = COLORS.darkDarkGray;
const DEFAULT_LABEL_COLOR = COLORS.lightGray;
const DEFAULT_AXIS_COLOR = COLORS.darkGray;

const GRAPH_COLORS = [
    COLORS.blue,
    COLORS.gold,
    COLORS.green,
    COLORS.red,
    COLORS.purple,
    COLORS.white,
    COLORS.darkBlue,
    COLORS.brown,
    COLORS.darkGreen,
    COLORS.pink
];

const getColor = (n: number): RGBColor => hexToRgb(GRAPH_COLORS[n % GRAPH_COLORS.length]); 

export interface LineGraphOptions {
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    
    lineStroke?: number;
    horizontalSpacing?: number;

    title?: string;
    titleHeight?: number;
    labels?: string[];
    labelHeight?: number;
};

export const lineGraph = (data: number[][], renderer: Renderer, options?: LineGraphOptions) => {
    const width = options.width || renderer.size().width;
    const height = options.height || renderer.size().height;
    
    const lineStroke = options.lineStroke || DEFAULT_LINE_STROKE;
    const hSpacing = options.horizontalSpacing || DEFAULT_HSPACING;
    
    const title = options.title;
    const titleHeight = title ? (options.titleHeight || DEFAULT_TITLE_HEIGHT) : 0;
    
    const labels = options.labels || [];
    const labelHeight = labels.length !== 0 ? (options.labelHeight || DEFAULT_LABEL_HEIGHT) : 0;
    
    const graphHeight = height - labelHeight - titleHeight;

    let offsetX = options.offsetX || 0;
    let offsetY = options.offsetY || 0;

    // draw title
    if (title) {
        renderer.color(...hexToRgb(DEFAULT_TITLE_COLOR));
        renderer.font(DEFAULT_FONT_FAMILY, titleHeight);
        renderer.text(offsetX + Math.floor(width / 2), offsetY + Math.floor(titleHeight / 2), title, true /* centered */);

        // push the rest of the graph down
        offsetY += titleHeight;
    }

    // draw labels
    if (labels.length > 0) {
        const labelXStep = Math.floor((width - (hSpacing * 2)) / labels.length);
        const swatchSize = Math.floor(0.8 * labelHeight);
        const swatchPadding = Math.floor((labelHeight - swatchSize) / 2);
        const swatchY = offsetY + graphHeight + swatchPadding;
        const labelBaseline = offsetY + graphHeight + labelHeight;
        let x = offsetX + hSpacing;

        labels.forEach((text, labelIndex) => {
            renderer.color(...getColor(labelIndex));
            renderer.rect(x, swatchY, swatchSize, swatchSize);

            const labelX = x + swatchSize + hSpacing;

            renderer.color(...hexToRgb(DEFAULT_LABEL_COLOR));
            renderer.font(DEFAULT_FONT_FAMILY, labelHeight);
            renderer.text(labelX, labelBaseline, text);

            x += labelXStep;
        });
    }

    // draw axes
    renderer.color(...hexToRgb(DEFAULT_AXIS_COLOR));
    renderer.line(offsetX + hSpacing, offsetY, offsetX + hSpacing, offsetY + graphHeight, lineStroke);
    renderer.line(offsetX + hSpacing, offsetY + graphHeight, offsetX + width - hSpacing, offsetY + graphHeight, lineStroke);

    // how large is the largest set of data points?
    const maxLength = data.reduce((max, values) => Math.max(max, values.length), -Infinity);
    
    // if we don't have more than 2 data points, we can't draw any lines.
    if (maxLength < 2) {
        return;
    }

    // how far to space points on graph
    const xStep = Math.floor((width - (hSpacing * 2)) / (maxLength - 1));

    // draw vertical lines for where data points go
    for (let x = (offsetX + hSpacing + xStep); x < (offsetX + width); x += xStep) {
        renderer.color(...hexToRgb(DEFAULT_VLINE_COLOR));
        renderer.line(x, offsetY, x, offsetY + graphHeight, lineStroke);
    }
    
    // calculate upper/lower bounds of all data points
    const maxValue = data.reduce((max, values) => Math.max(max, ...values), -Infinity);
    const minValue = data.reduce((min, values) => Math.min(min, ...values), Infinity);
    const range = maxValue - minValue;

    const calcY = (v: number) => {
        return offsetY + Math.floor((1 - (Math.abs(v - minValue) / range)) * graphHeight);
    };

    // x cursor
    let x = offsetX + hSpacing;

    data.forEach((dataSet, dataSetIndex) => {
        // reset x cursor
        x = offsetX + hSpacing;
        
        // i starts at 1 to skip first value (we look back at it)
        for(let i = 1; i < dataSet.length; i++) {
            const v1 = dataSet[i -1];
            const v2 = dataSet[i];

            const x1 = x;
            const y1 = calcY(v1);
            
            const x2 = (x += xStep);
            const y2 = calcY(v2);

            renderer.color(...getColor(dataSetIndex));
            renderer.line(x1, y1, x2, y2, lineStroke);
        }
    });
}