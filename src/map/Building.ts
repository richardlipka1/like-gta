import { TILE_PX } from '../constants';

export abstract class Building {
    x: number;
    y: number;
    width: number;
    height: number;
    abstract color: string;
    abstract label: string;

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getPixelBounds(): { x: number; y: number; w: number; h: number } {
        return { x: this.x * TILE_PX, y: this.y * TILE_PX, w: this.width * TILE_PX, h: this.height * TILE_PX };
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const b = this.getPixelBounds();
        const sx = b.x - camX;
        const sy = b.y - camY;
        ctx.fillStyle = this.color;
        ctx.fillRect(sx, sy, b.w, b.h);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, b.w - 2, b.h - 2);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.label, sx + b.w / 2, sy + b.h / 2);
    }

    collidesWith(ex: number, ey: number, ew: number, eh: number): boolean {
        const b = this.getPixelBounds();
        return ex < b.x + b.w && ex + ew > b.x && ey < b.y + b.h && ey + eh > b.y;
    }
}
