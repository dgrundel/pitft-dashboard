
export type RGBColor = [number, number, number];

export const COLORS = {
    blue: '035aa6',
    brown: '4c1f06',
    darkBlue: '002342',
    darkDarkGray: '111111',
    darkGray: '333333',
    darkGreen: '054c2e',
    gold: 'f5a31a',
    green: '79d70f',
    lightGray: 'edf4f2',
    pink: 'c65bb6',
    purple: '4d089a',
    red: 'd32626',
    white: 'ffffff'
};

export function hexToRgb (hexStr: string): RGBColor {
    return [
        parseInt(hexStr.substring(0, 2), 16) / 255,
        parseInt(hexStr.substring(2, 4), 16) / 255,
        parseInt(hexStr.substring(4), 16) / 255
    ];
}