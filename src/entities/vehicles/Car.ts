import { Entity } from '../Entity';
import type { Character } from '../Character';
import { InputHandler } from '../../InputHandler';
import { PIXEL_SIZE } from '../../constants';

export abstract class Car extends Entity {
    abstract color: string;
    abstract carSpeed: number;
    driver: Character | null = null;
    direction: 'up' | 'down' | 'left' | 'right' = 'right';

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.width = 14 * PIXEL_SIZE;
        this.height = 6 * PIXEL_SIZE;
    }

    canEnter(character: Character): boolean {
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
        if (input.isDown('ArrowUp') || input.isDown('w') || input.isDown('W')) { dy = -1; this.direction = 'up'; }
        if (input.isDown('ArrowDown') || input.isDown('s') || input.isDown('S')) { dy = 1; this.direction = 'down'; }
        if (input.isDown('ArrowLeft') || input.isDown('a') || input.isDown('A')) { dx = -1; this.direction = 'left'; }
        if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) { dx = 1; this.direction = 'right'; }

        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        this.x += dx * this.carSpeed * dt;
        this.y += dy * this.carSpeed * dt;

        this.driver.x = this.x;
        this.driver.y = this.y;
    }

    update(_dt: number): void {}

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sx = this.x - camX;
        const sy = this.y - camY;
        ctx.fillStyle = this.color;
        ctx.fillRect(sx, sy, this.width, this.height);
        ctx.fillStyle = '#222222';
        ctx.fillRect(sx, sy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(sx + this.width - PIXEL_SIZE * 2, sy, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(sx, sy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillRect(sx + this.width - PIXEL_SIZE * 2, sy + this.height - PIXEL_SIZE * 2, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
        ctx.fillStyle = '#aaddff';
        ctx.fillRect(sx + PIXEL_SIZE * 3, sy + PIXEL_SIZE, PIXEL_SIZE * 4, PIXEL_SIZE * 2);
        ctx.fillRect(sx + PIXEL_SIZE * 8, sy + PIXEL_SIZE, PIXEL_SIZE * 3, PIXEL_SIZE * 2);
    }
}
