import { Entity } from './Entity';
import { PIXEL_SIZE } from '../constants';

export class Flag extends Entity {
    heldBy: string | null = null;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.width = 6 * PIXEL_SIZE;
        this.height = 6 * PIXEL_SIZE;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sx = this.x - camX;
        const sy = this.y - camY;

        // Pole
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(sx + 8, sy, 4, 28);

        // Flag banner
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(sx + 12, sy, 18, 12);

        // Star symbol on flag
        ctx.fillStyle = '#cc5500';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★', sx + 21, sy + 10);
        ctx.textAlign = 'left';

        // Base
        ctx.fillStyle = '#888888';
        ctx.fillRect(sx + 2, sy + 26, 20, 4);
    }

    update(_dt: number): void {}
}
