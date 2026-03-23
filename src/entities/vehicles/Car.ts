import { Entity } from '../Entity';
import type { Character } from '../Character';
import { InputHandler } from '../../InputHandler';
import { PIXEL_SIZE, WORLD_W, WORLD_H } from '../../constants';

export abstract class Car extends Entity {
    abstract color: string;
    abstract carSpeed: number;
    driver: Character | null = null;
    direction: 'up' | 'down' | 'left' | 'right' = 'right';

    /** NPC autonomous movement velocity (px/s). Set to non-zero to enable NPC driving. */
    npcVelocityX: number = 0;
    npcVelocityY: number = 0;

    health: number = 100;
    maxHealth: number = 100;
    destroyed: boolean = false;

    /** Cooldown (seconds) before the car can damage the player again after a collision. */
    hitCooldown: number = 0;

    private fireAnimTimer: number = 0;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.width = 14 * PIXEL_SIZE;
        this.height = 6 * PIXEL_SIZE;
    }

    takeDamage(amount: number): void {
        if (this.destroyed) return;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.destroyed = true;
            this.npcVelocityX = 0;
            this.npcVelocityY = 0;
        }
    }

    canEnter(character: Character): boolean {
        if (this.destroyed) return false;
        const cx = character.x + character.width / 2;
        const cy = character.y + character.height / 2;
        const mx = this.x + this.width / 2;
        const my = this.y + this.height / 2;
        const dx = cx - mx;
        const dy = cy - my;
        return Math.sqrt(dx * dx + dy * dy) < 60;
    }

    enter(character: Character): void {
        this.driver = character;
    }

    exit(): void {
        if (this.driver) {
            this.driver.x = this.x + this.width + 4;
            this.driver.y = this.y;
            this.driver = null;
        }
    }

    handleInput(input: InputHandler, dt: number): void {
        if (!this.driver) return;
        let dx = 0, dy = 0;
        if (input.isDown('ArrowUp') || input.isDown('w') || input.isDown('W')) { dy = -1; }
        if (input.isDown('ArrowDown') || input.isDown('s') || input.isDown('S')) { dy = 1; }
        if (input.isDown('ArrowLeft') || input.isDown('a') || input.isDown('A')) { dx = -1; }
        if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) { dx = 1; }

        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        this.x += dx * this.carSpeed * dt;
        this.y += dy * this.carSpeed * dt;

        this.driver.x = this.x;
        this.driver.y = this.y;

        this.updateDirection(dx, dy);
    }

    /** Autonomous NPC driving — moves the car when no player is driving. */
    updateNpc(dt: number, isRoad: (x: number, y: number) => boolean): void {
        if (this.hitCooldown > 0) this.hitCooldown -= dt;

        if (this.destroyed) {
            this.fireAnimTimer += dt;
            return;
        }

        if (this.driver || (this.npcVelocityX === 0 && this.npcVelocityY === 0)) return;

        const nextX = this.x + this.npcVelocityX * dt;
        const nextY = this.y + this.npcVelocityY * dt;

        // Check centre of car stays on road and within world
        const cx = nextX + this.width / 2;
        const cy = nextY + this.height / 2;

        const offWorld = nextX < 0 || nextX + this.width > WORLD_W || nextY < 0 || nextY + this.height > WORLD_H;

        if (offWorld || !isRoad(cx, cy)) {
            // Reverse direction
            this.npcVelocityX *= -1;
            this.npcVelocityY *= -1;
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        this.updateDirection(this.npcVelocityX, this.npcVelocityY);
    }

    private updateDirection(dx: number, dy: number): void {
        if (dx > 0) this.direction = 'right';
        else if (dx < 0) this.direction = 'left';
        else if (dy > 0) this.direction = 'down';
        else if (dy < 0) this.direction = 'up';
    }

    update(_dt: number): void {}

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sx = this.x - camX;
        const sy = this.y - camY;

        ctx.save();

        const facingLeft = this.direction === 'left';
        if (facingLeft) {
            // Flip horizontally around the car centre
            ctx.translate(sx + this.width, sy);
            ctx.scale(-1, 1);
            this.drawCarBody(ctx, 0, 0);
            if (this.destroyed) this.drawFire(ctx, 0, 0);
        } else {
            this.drawCarBody(ctx, sx, sy);
            if (this.destroyed) this.drawFire(ctx, sx, sy);
        }

        ctx.restore();
    }

    private drawFire(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
        const ps = PIXEL_SIZE;
        const frame = Math.floor(this.fireAnimTimer * 8) % 2;
        const flamesA: [number, number, string][] = [
            [ps * 1, -ps * 2, '#ff6600'],
            [ps * 3, -ps * 3, '#ffaa00'],
            [ps * 5, -ps * 2, '#ff2200'],
            [ps * 7, -ps * 3, '#ff6600'],
            [ps * 9, -ps * 2, '#ffaa00'],
            [ps * 11, -ps * 1, '#ff2200'],
            [ps * 2, -ps, '#ffff00'],
            [ps * 6, -ps * 2, '#ffaa00'],
            [ps * 10, -ps, '#ff6600'],
        ];
        const flamesB: [number, number, string][] = [
            [ps * 2, -ps * 2, '#ffaa00'],
            [ps * 4, -ps * 3, '#ff2200'],
            [ps * 6, -ps * 2, '#ff6600'],
            [ps * 8, -ps * 3, '#ffaa00'],
            [ps * 10, -ps * 2, '#ff2200'],
            [ps * 12, -ps * 1, '#ff6600'],
            [ps * 1, -ps, '#ffff00'],
            [ps * 5, -ps * 2, '#ff2200'],
            [ps * 9, -ps, '#ffaa00'],
        ];
        const flames = frame === 0 ? flamesA : flamesB;
        // Darken car body to show it is wrecked
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(ox, oy, this.width, this.height);
        for (const [dx, dy, color] of flames) {
            ctx.fillStyle = color;
            ctx.fillRect(ox + dx, oy + dy, ps, ps);
        }
    }

    private drawCarBody(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
        ctx.fillStyle = this.color;
        ctx.fillRect(ox, oy, this.width, this.height);
        // Wheels
        ctx.fillStyle = '#222222';
        ctx.fillRect(ox, oy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(ox + this.width - PIXEL_SIZE * 2, oy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(ox, oy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(ox + this.width - PIXEL_SIZE * 2, oy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        // Windows
        ctx.fillStyle = '#aaddff';
        ctx.fillRect(ox + PIXEL_SIZE * 3, oy + PIXEL_SIZE, PIXEL_SIZE * 4, PIXEL_SIZE * 2);
        ctx.fillRect(ox + PIXEL_SIZE * 8, oy + PIXEL_SIZE, PIXEL_SIZE * 3, PIXEL_SIZE * 2);
    }
}
