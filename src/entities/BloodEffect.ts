import { PIXEL_SIZE } from '../constants';

export class BloodEffect {
    x: number;
    y: number;
    private static readonly MAX_LIFETIME = 2;
    private lifetime: number = BloodEffect.MAX_LIFETIME;

    private static readonly PIXELS: [number, number][] = [
        [0, 0],
        [-PIXEL_SIZE, -PIXEL_SIZE], [PIXEL_SIZE, -PIXEL_SIZE],
        [-PIXEL_SIZE * 2, 0], [PIXEL_SIZE * 2, 0],
        [0, -PIXEL_SIZE * 2], [0, PIXEL_SIZE * 2],
        [-PIXEL_SIZE, PIXEL_SIZE], [PIXEL_SIZE, PIXEL_SIZE],
        [-PIXEL_SIZE * 2, -PIXEL_SIZE], [PIXEL_SIZE * 2, -PIXEL_SIZE],
        [-PIXEL_SIZE, -PIXEL_SIZE * 2], [PIXEL_SIZE, -PIXEL_SIZE * 2],
    ];

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    update(dt: number): void {
        this.lifetime -= dt;
    }

    get active(): boolean {
        return this.lifetime > 0;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const alpha = Math.max(0, this.lifetime / BloodEffect.MAX_LIFETIME);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#cc0000';
        const sx = this.x - camX;
        const sy = this.y - camY;
        for (const [dx, dy] of BloodEffect.PIXELS) {
            ctx.fillRect(sx + dx, sy + dy, PIXEL_SIZE, PIXEL_SIZE);
        }
        ctx.globalAlpha = 1;
    }
}
