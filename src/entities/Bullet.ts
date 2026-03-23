import { Entity } from './Entity';
import { PIXEL_SIZE } from '../constants';

export class Bullet extends Entity {
    dx: number;
    dy: number;
    speed: number = 300;
    owner: 'player' | 'police' | 'opponent';
    damage: number = 25;

    constructor(x: number, y: number, dx: number, dy: number, owner: 'player' | 'police' | 'opponent') {
        super();
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.owner = owner;
        this.width = 4;
        this.height = 4;
    }

    update(dt: number): void {
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        ctx.fillStyle = this.owner === 'player' ? '#ffff00' : '#ff4400';
        ctx.fillRect(this.x - camX - 2, this.y - camY - 2, PIXEL_SIZE, PIXEL_SIZE);
    }
}
