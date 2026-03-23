import { PIXEL_SIZE } from '../constants';

export class ExplosionEffect {
    x: number;
    y: number;
    private static readonly MAX_LIFETIME = 0.7;
    private lifetime: number = ExplosionEffect.MAX_LIFETIME;

    private static readonly ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    private static readonly RING_COLORS = ['#ff6600', '#ffaa00', '#ff2200', '#ffff00'];

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
        const progress = 1 - this.lifetime / ExplosionEffect.MAX_LIFETIME;
        const alpha = Math.max(0, this.lifetime / ExplosionEffect.MAX_LIFETIME);
        ctx.globalAlpha = alpha;

        const sx = Math.round(this.x - camX);
        const sy = Math.round(this.y - camY);
        const ps = PIXEL_SIZE;

        // Expanding ring of pixel sparks
        const radius = Math.round(progress * 48);
        for (let i = 0; i < ExplosionEffect.ANGLES.length; i++) {
            const rad = (ExplosionEffect.ANGLES[i] * Math.PI) / 180;
            const px = Math.round(Math.cos(rad) * radius);
            const py = Math.round(Math.sin(rad) * radius);
            ctx.fillStyle = ExplosionEffect.RING_COLORS[i % ExplosionEffect.RING_COLORS.length];
            ctx.fillRect(sx + px - ps / 2, sy + py - ps / 2, ps, ps);
        }

        // Central flash during the first 35% of the explosion
        if (progress < 0.35) {
            const flashSize = Math.round(((0.35 - progress) / 0.35) * 24);
            ctx.fillStyle = '#ffff88';
            ctx.fillRect(sx - flashSize / 2, sy - flashSize / 2, flashSize, flashSize);
        }

        ctx.globalAlpha = 1;
    }
}
