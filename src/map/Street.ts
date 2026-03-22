import { TILE_PX, PIXEL_SIZE } from '../constants';

export class Street {
    x: number;
    y: number;
    length: number;
    horizontal: boolean;

    constructor(x: number, y: number, length: number, horizontal: boolean) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.horizontal = horizontal;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const px = this.x * TILE_PX - camX;
        const py = this.y * TILE_PX - camY;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = PIXEL_SIZE;
        ctx.setLineDash([TILE_PX / 2, TILE_PX / 2]);
        ctx.beginPath();
        if (this.horizontal) {
            const cy = py + TILE_PX;
            ctx.moveTo(px, cy);
            ctx.lineTo(px + this.length * TILE_PX, cy);
        } else {
            const cx = px + TILE_PX;
            ctx.moveTo(cx, py);
            ctx.lineTo(cx, py + this.length * TILE_PX);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
