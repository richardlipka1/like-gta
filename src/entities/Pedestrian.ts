import { Character } from './Character';
import { PEDESTRIAN_SPRITES } from '../sprites';
import { PIXEL_SIZE } from '../constants';

export class Pedestrian extends Character {
    speed: number = 40;
    private timer: number = 0;
    private changeInterval: number = 2 + Math.random() * 2;
    private pedType: number;

    constructor(x: number, y: number, pedType: number = 0) {
        super();
        this.x = x;
        this.y = y;
        this.pedType = pedType % 3;
        this.width = 8 * PIXEL_SIZE;
        this.height = 8 * PIXEL_SIZE;
        const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
        this.direction = dirs[Math.floor(Math.random() * 4)];
    }

    update(dt: number): void {
        this.timer += dt;
        if (this.timer >= this.changeInterval) {
            this.timer = 0;
            this.changeInterval = 2 + Math.random() * 2;
            const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
            this.direction = dirs[Math.floor(Math.random() * 4)];
        }
        if (this.direction === 'up') this.y -= this.speed * dt;
        else if (this.direction === 'down') this.y += this.speed * dt;
        else if (this.direction === 'left') this.x -= this.speed * dt;
        else if (this.direction === 'right') this.x += this.speed * dt;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sprites = PEDESTRIAN_SPRITES[this.pedType];
        const sprite = sprites[this.direction];
        this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
}
