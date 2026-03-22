import { Character, Direction } from './Character';
import { InputHandler } from '../InputHandler';
import { Bullet } from './Bullet';
import type { Car } from './vehicles/Car';
import { PLAYER_SPRITES } from '../sprites';
import { PIXEL_SIZE } from '../constants';

export class Player extends Character {
    inCar: Car | null = null;
    starLevel: number = 0;
    speed: number = 90;
    lives: number = 3;
    shootCooldown: number = 0;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.width = 8 * PIXEL_SIZE;
        this.height = 8 * PIXEL_SIZE;
        this.health = 100;
        this.maxHealth = 100;
    }

    handleInput(input: InputHandler, dt: number, bullets: Bullet[], onEnterCar: () => void): void {
        if (this.inCar) return;

        let dx = 0, dy = 0;
        if (input.isDown('ArrowUp') || input.isDown('w') || input.isDown('W')) { dy = -1; this.direction = 'up'; }
        if (input.isDown('ArrowDown') || input.isDown('s') || input.isDown('S')) { dy = 1; this.direction = 'down'; }
        if (input.isDown('ArrowLeft') || input.isDown('a') || input.isDown('A')) { dx = -1; this.direction = 'left'; }
        if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) { dx = 1; this.direction = 'right'; }

        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;

        this.shootCooldown -= dt;
        if (input.justPressed(' ') && this.shootCooldown <= 0) {
            this.shootCooldown = 0.3;
            const bx = this.x + this.width / 2;
            const by = this.y + this.height / 2;
            let bdx = 0, bdy = 0;
            if (this.direction === 'up') bdy = -1;
            else if (this.direction === 'down') bdy = 1;
            else if (this.direction === 'left') bdx = -1;
            else if (this.direction === 'right') bdx = 1;
            bullets.push(new Bullet(bx, by, bdx, bdy, 'player'));
            if (this.starLevel < 3) this.starLevel++;
        }

        if (input.justPressed('e') || input.justPressed('E')) {
            onEnterCar();
        }
    }

    update(_dt: number): void {}

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        if (this.inCar) return;
        const sprite = PLAYER_SPRITES[this.direction];
        this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
}
