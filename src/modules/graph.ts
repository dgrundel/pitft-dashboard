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

const getGraphColor = (n: number): RGBColor => hexToRgb(GRAPH_COLORS[n % GRAPH_COLORS.length]); 

export interface GraphDataSet {
    label?: string;
    values: number[];
}

export interface LineGraphOptions {
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;

    upperBound?: number;
    lowerBound?: number;
    
    lineStroke?: number;
    horizontalSpacing?: number;

    title?: string;
    titleHeight?: number;
    labelHeight?: number;

    valueDisplayFormatter?: (n: number) => string;
};

export const lineGraph = (dataSets: GraphDataSet[], renderer: Renderer, options?: LineGraphOptions) => {
    const dataSetValues: number[][] = dataSets.map(dataSet => dataSet.values);
    
    const width = options.width || renderer.size().width;
    const height = options.height || renderer.size().height;
    
    const lineStroke = options.lineStroke || DEFAULT_LINE_STROKE;
    const hSpacing = options.horizontalSpacing || DEFAULT_HSPACING;
    
    const title = options.title;
    const titleHeight = title ? (options.titleHeight || DEFAULT_TITLE_HEIGHT) : 0;
    
    const labels = dataSets.map(dataSet => dataSet.label);
    const hasLabels = !!labels.find(s => !!s);
    const labelHeight = hasLabels ? (options.labelHeight || DEFAULT_LABEL_HEIGHT) : 0;

    const valueDisplayFormatter = options.valueDisplayFormatter || (n => n.toFixed(2));
    
    const graphHeight = height - labelHeight - titleHeight;

    const upperBound = options.upperBound || -Infinity;
    const lowerBound = options.lowerBound || Infinity;

    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    let y = offsetY;

    // draw title
    if (title) {
        renderer.color(...hexToRgb(DEFAULT_TITLE_COLOR));
        renderer.font(DEFAULT_FONT_FAMILY, titleHeight);
        renderer.text(offsetX + Math.floor(width / 2), y + Math.floor(titleHeight / 2), title, true /* centered */);

        // push the rest of the graph down
        y += titleHeight;
    }

    // draw labels
    if (hasLabels) {
        const labelXStep = Math.floor((width - (hSpacing * 2)) / labels.length);
        const swatchSize = Math.floor(0.8 * labelHeight);
        const swatchPadding = Math.floor((labelHeight - swatchSize) / 2);
        const swatchY = y + graphHeight + swatchPadding;
        const labelBaseline = y + graphHeight + labelHeight;
        let x = offsetX + hSpacing;

        labels.forEach((text, labelIndex) => {
            if(!text) {
                return;
            }

            renderer.color(...getGraphColor(labelIndex));
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
    renderer.line(offsetX + hSpacing, y, offsetX + hSpacing, y + graphHeight, lineStroke);
    renderer.line(offsetX + hSpacing, y + graphHeight, offsetX + width - hSpacing, y + graphHeight, lineStroke);

    // how large is the largest set of data points?
    const maxLength = dataSetValues.reduce((max, values) => Math.max(max, values.length), -Infinity);
    
    // if we don't have more than 2 data points, we can't draw any lines.
    if (maxLength < 2) {
        return;
    }

    // how far to space points on graph
    const xStep = Math.floor((width - (hSpacing * 2)) / (maxLength - 1));

    // draw vertical lines for where data points go
    for (let x = (offsetX + hSpacing + xStep); x < (offsetX + width); x += xStep) {
        renderer.color(...hexToRgb(DEFAULT_VLINE_COLOR));
        renderer.line(x, y, x, y + graphHeight, lineStroke);
    }
    
    // calculate upper/lower bounds of all data points
    const maxValue = Math.max(upperBound, dataSetValues.reduce((max, values) => Math.max(max, ...values), -Infinity));
    const minValue = Math.min(lowerBound, dataSetValues.reduce((min, values) => Math.min(min, ...values), Infinity));
    const range = maxValue - minValue;

    const calcY = (v: number) => {
        return y + Math.floor((1 - (Math.abs(v - minValue) / range)) * graphHeight);
    };

    // x cursor
    let x = offsetX + hSpacing;

    dataSets.forEach((dataSet, dataSetIndex) => {
        const values = dataSet.values;

        // skip data sets with less than two data points
        if (values.length < 2) {
            return;
        }

        // reset x cursor
        x = offsetX + hSpacing;
        
        // i starts at 1 to skip first value (we look back at it)
        for(let i = 1; i < values.length; i++) {
            const v1 = values[i -1];
            const v2 = values[i];

            const x1 = x;
            const y1 = calcY(v1);
            
            const x2 = (x += xStep);
            const y2 = calcY(v2);

            renderer.color(...getGraphColor(dataSetIndex));
            renderer.line(x1, y1, x2, y2, lineStroke);
        }
    });

    // labels on graph for min/max value
    renderer.color(...hexToRgb(DEFAULT_LABEL_COLOR));
    renderer.font(DEFAULT_FONT_FAMILY, labelHeight);
    renderer.text(offsetX + width - hSpacing, offsetY + titleHeight + labelHeight, valueDisplayFormatter(maxValue), false, 0, true);
    renderer.text(offsetX + width - hSpacing, offsetY + titleHeight + graphHeight, valueDisplayFormatter(minValue), false, 0, true);
}