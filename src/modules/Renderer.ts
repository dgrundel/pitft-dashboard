import * as pitft from 'pitft';

export interface RendererOptions {
    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
}

export class Renderer implements pitft.FrameBuffer {
    readonly fb: pitft.FrameBuffer;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly width: number;
    readonly height: number;

    constructor(fb: pitft.FrameBuffer, options: RendererOptions = {}) {
        this.fb = fb;
        this.offsetX = options.offsetX || 0;
        this.offsetY = options.offsetY || 0;
        this.width = options.width || fb.size().width;
        this.height = options.height || fb.size().height;
    }

    size(): { width: number; height: number; } {
        return { 
            width: this.width, 
            height: this.height 
        };
    }

    data(): Buffer {
        return this.fb.data.apply(this.fb, arguments);
    }

    clear(): void {
        this.fb.clear.apply(this.fb, arguments);
    }
    
    blit(): void {
        this.fb.blit.apply(this.fb, arguments);
    }

    color(patternID: number): void;
    color(r: number, g: number, b: number): void;
    color(r: any, g?: any, b?: any) {
        this.fb.color.apply(this.fb, arguments);
    }

    patternCreateLinear(x0: number, y0: number, x1: number, y2: number): number;
    patternCreateLinear(patternID: number, x0: number, y0: number, x1: number, y2: number): number;
    patternCreateLinear(patternID: any, x0: any, y0: any, x1: any, y2?: any) {
        return arguments.length === 4
            ? this.fb.patternCreateLinear.apply(this.fb, [
                arguments[0] + this.offsetX,
                arguments[1] + this.offsetY,
                arguments[2] + this.offsetX,
                arguments[3] + this.offsetY
            ])
            : this.fb.patternCreateLinear.apply(this.fb, [
                arguments[0],
                arguments[1] + this.offsetX,
                arguments[2] + this.offsetY,
                arguments[3] + this.offsetX,
                arguments[4] + this.offsetY
            ]);
    }

    patternCreateRGB(r: number, g: number, b: number, a?: number): number;
    patternCreateRGB(patternID: number, r: number, g: number, b: number, a?: number): number;
    patternCreateRGB(patternID: any, r: any, g: any, b?: any, a?: any) {
        return this.fb.patternCreateRGB.apply(this.fb, arguments);
    }

    patternAddColorStop(patternID: number, offset: number, r: number, g: number, b: number, a?: number): void {
        this.fb.patternAddColorStop.apply(this.fb, arguments);
    }

    patternDestroy(patternID: number): void {
        this.fb.patternDestroy.apply(this.fb, arguments);
    }

    fill(): void {
        this.fb.fill.apply(this.fb, arguments);
    }

    line(x0: number, y0: number, x1: number, y1: number, width?: number): void {
        this.fb.line.apply(this.fb, [
            arguments[0] + this.offsetX,
            arguments[1] + this.offsetY,
            arguments[2] + this.offsetX,
            arguments[3] + this.offsetY,
            arguments[4]
        ]);
    }

    rect(x: number, y: number, width: number, height: number, outline?: boolean, borderWidth?: number): void {
        this.fb.rect.apply(this.fb, [
            arguments[0] + this.offsetX,
            arguments[1] + this.offsetY,
            arguments[2],
            arguments[3],
            arguments[4],
            arguments[5]
        ]);
    }

    circle(x: number, y: number, radius: number, outline?: boolean, borderWidth?: boolean): void {
        this.fb.circle.apply(this.fb, [
            arguments[0] + this.offsetX,
            arguments[1] + this.offsetY,
            arguments[2],
            arguments[3],
            arguments[4]
        ]);
    }

    font(fontName: string, fontSize: number, fontBold?: boolean): void {
        this.fb.font.apply(this.fb, arguments);
    }

    text(x: number, y: number, text: string, centered?: boolean, rotation?: number, right?: boolean): void {
        this.fb.text.apply(this.fb, [
            arguments[0] + this.offsetX,
            arguments[1] + this.offsetY,
            arguments[2],
            arguments[3],
            arguments[4],
            arguments[5]
        ]);
    }

    image(x: number, y: number, path: string): void {
        this.fb.image.apply(this.fb, [
            arguments[0] + this.offsetX,
            arguments[1] + this.offsetY,
            arguments[2]
        ]);
    }
}
