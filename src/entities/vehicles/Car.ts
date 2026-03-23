import { Entity } from '../Entity';
import type { Character } from '../Character';
import { InputHandler } from '../../InputHandler';
import { PIXEL_SIZE, WORLD_W, WORLD_H } from '../../constants';

export abstract class Car extends Entity {
    abstract color: string;
    abstract carSpeed: number;
    driver: Character | null = null;
    direction: 'up' | 'down' | 'left' | 'right' = 'right';
    private orientation: 'horizontal' | 'vertical' = 'horizontal';

    /** Car's natural width when oriented horizontally (facing left/right). */
    get baseWidth(): number {
        return this.orientation === 'horizontal' ? this.width : this.height;
    }

    /** Car's natural height when oriented horizontally (facing left/right). */
    get baseHeight(): number {
        return this.orientation === 'horizontal' ? this.height : this.width;
    }

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
    updateNpc(dt: number, isRoad: (x: number, y: number) => boolean, otherCars?: Car[]): void {
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

        const collidesWithCar = otherCars?.some(other => {
            if (other === this || other.destroyed) return false;
            return (
                nextX < other.x + other.width &&
                nextX + this.width > other.x &&
                nextY < other.y + other.height &&
                nextY + this.height > other.y
            );
        }) ?? false;

        if (offWorld || !isRoad(cx, cy) || collidesWithCar) {
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
        if (dx === 0 && dy === 0) return;

        const prevDirection = this.direction;
        if (dx > 0) this.direction = 'right';
        else if (dx < 0) this.direction = 'left';
        else if (dy > 0) this.direction = 'down';
        else if (dy < 0) this.direction = 'up';

        if (this.direction === prevDirection) return;

        const nowHoriz = this.direction === 'left' || this.direction === 'right';
        const wasHoriz = this.orientation === 'horizontal';

        if (nowHoriz !== wasHoriz) {
            // Swap bounding-box dimensions while keeping the car's centre in place
            const centreX = this.x + this.width / 2;
            const centreY = this.y + this.height / 2;
            [this.width, this.height] = [this.height, this.width];
            this.x = centreX - this.width / 2;
            this.y = centreY - this.height / 2;
            this.orientation = nowHoriz ? 'horizontal' : 'vertical';
        }
    }

    update(_dt: number): void {}

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sx = this.x - camX;
        const sy = this.y - camY;

        ctx.save();

        // Move to the car's centre in screen space, then rotate to face the current direction
        ctx.translate(sx + this.width / 2, sy + this.height / 2);
        switch (this.direction) {
            case 'left': ctx.rotate(Math.PI);        break;
            case 'down': ctx.rotate(Math.PI / 2);   break;
            case 'up':   ctx.rotate(-Math.PI / 2);  break;
            // 'right' needs no rotation
        }

        // drawCarBody / drawFire always draw as if the car faces right, centred at origin
        const hw = this.baseWidth / 2;
        const hh = this.baseHeight / 2;
        this.drawCarBody(ctx, -hw, -hh);
        if (this.destroyed) this.drawFire(ctx, -hw, -hh);

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
        ctx.fillRect(ox, oy, this.baseWidth, this.baseHeight);
        for (const [dx, dy, color] of flames) {
            ctx.fillStyle = color;
            ctx.fillRect(ox + dx, oy + dy, ps, ps);
        }
    }

    private drawCarBody(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
        const ps = PIXEL_SIZE;
        const w = this.baseWidth;
        const h = this.baseHeight;

        // === Body base ===
        ctx.fillStyle = this.color;
        ctx.fillRect(ox, oy, w, h);

        // === Roof / cabin area (semi-transparent dark overlay) ===
        ctx.fillStyle = 'rgba(0,0,0,0.20)';
        ctx.fillRect(ox + ps * 4, oy + ps, w - ps * 8, h - ps * 2);

        // === Windshield (front glass – right edge when facing right) ===
        ctx.fillStyle = '#c0e8ff';
        ctx.fillRect(ox + w - ps * 5, oy + ps, ps * 2, h - ps * 2);

        // === Rear window (back – left edge when facing right) ===
        ctx.fillStyle = '#7aaabb';
        ctx.fillRect(ox + ps * 3, oy + ps, ps * 2, h - ps * 2);

        // === Wheels (dark grey, at the four corners) ===
        ctx.fillStyle = '#111111';
        ctx.fillRect(ox + ps,         oy,              ps * 2, ps * 2);  // rear-top
        ctx.fillRect(ox + ps,         oy + h - ps * 2, ps * 2, ps * 2);  // rear-bottom
        ctx.fillRect(ox + w - ps * 3, oy,              ps * 2, ps * 2);  // front-top
        ctx.fillRect(ox + w - ps * 3, oy + h - ps * 2, ps * 2, ps * 2);  // front-bottom

        // === Wheel hubcaps (lighter grey centre) ===
        const hubOff = 2;              // inset from wheel edge
        const hubSize = ps * 2 - 4;   // hubcap side length (wheel width minus two insets)
        ctx.fillStyle = '#555555';
        ctx.fillRect(ox + ps + hubOff,         oy + hubOff,              hubSize, hubSize);
        ctx.fillRect(ox + ps + hubOff,         oy + h - ps * 2 + hubOff, hubSize, hubSize);
        ctx.fillRect(ox + w - ps * 3 + hubOff, oy + hubOff,              hubSize, hubSize);
        ctx.fillRect(ox + w - ps * 3 + hubOff, oy + h - ps * 2 + hubOff, hubSize, hubSize);

        // === Front headlights (bright yellow, top and bottom of front edge) ===
        ctx.fillStyle = '#ffffcc';
        ctx.fillRect(ox + w - ps, oy,          ps, ps);
        ctx.fillRect(ox + w - ps, oy + h - ps, ps, ps);

        // === Rear taillights (red, top and bottom of rear edge) ===
        ctx.fillStyle = '#cc1100';
        ctx.fillRect(ox,      oy,          ps, ps);
        ctx.fillRect(ox,      oy + h - ps, ps, ps);
    }
}
