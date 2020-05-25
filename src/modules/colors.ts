
export type RBGColor = [number, number, number];

export const COLORS = {
    blue: '035aa6',
    darkGray: '888888',
    darkGreen: '06623b',
    gold: 'f5a31a',
    green: '79d70f',
    lightGray: 'edf4f2',
    purple: '4d089a',
    red: 'd32626'
};

export const GRAPH_COLORS = [
    COLORS.blue,
    COLORS.gold,
    COLORS.green,
    COLORS.red,
    COLORS.purple
];

export function hexToRgb (hexStr: string): RBGColor {
    return [
        parseInt(hexStr.substring(0, 2), 16) / 255,
        parseInt(hexStr.substring(2, 4), 16) / 255,
        parseInt(hexStr.substring(4), 16) / 255
    ];
}