import { Character } from './Character';
import { Bullet } from './Bullet';
import type { Player } from './Player';
import { POLICEMAN_SPRITES } from '../sprites';
import { PIXEL_SIZE } from '../constants';

export class Policeman extends Character {
    speed: number = 75;
    state: 'patrol' | 'chase' | 'shoot' = 'patrol';
    target: Player;
    private shootTimer: number = 0;
    private patrolTimer: number = 0;
    private patrolInterval: number = 2 + Math.random() * 2;

    constructor(x: number, y: number, target: Player) {
        super();
        this.x = x;
        this.y = y;
        this.target = target;
        this.width = 8 * PIXEL_SIZE;
        this.height = 8 * PIXEL_SIZE;
        this.health = 100;
    }

    updateWithBullets(dt: number, bullets: Bullet[]): void {
        if (!this.target.active && !this.target.inCar) return;
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (this.target.starLevel > 0) {
            if (dist < 150) {
                this.state = 'shoot';
            } else if (dist < 400) {
                this.state = 'chase';
            } else {
                this.state = 'patrol';
            }
        } else {
            this.state = 'patrol';
        }

        if (this.state === 'chase' || this.state === 'shoot') {
            if (dist > 8) {
                const nx = dx / dist;
                const ny = dy / dist;
                this.x += nx * this.speed * dt;
                this.y += ny * this.speed * dt;
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            }
            if (this.state === 'shoot') {
                this.shootTimer += dt;
                if (this.shootTimer >= 1.5) {
                    this.shootTimer = 0;
                    const norm = dist > 0 ? dist : 1;
                    bullets.push(new Bullet(
                        this.x + this.width / 2, this.y + this.height / 2,
                        dx / norm, dy / norm,
                        'police'
                    ));
                }
            }
        } else {
            this.patrolTimer += dt;
            if (this.patrolTimer >= this.patrolInterval) {
                this.patrolTimer = 0;
                this.patrolInterval = 2 + Math.random() * 2;
                const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
                this.direction = dirs[Math.floor(Math.random() * 4)];
            }
            if (this.direction === 'up') this.y -= this.speed * 0.4 * dt;
            else if (this.direction === 'down') this.y += this.speed * 0.4 * dt;
            else if (this.direction === 'left') this.x -= this.speed * 0.4 * dt;
            else if (this.direction === 'right') this.x += this.speed * 0.4 * dt;
        }
    }

    update(_dt: number): void {
        // used by base class; actual logic in updateWithBullets
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const sprite = POLICEMAN_SPRITES[this.direction];
        this.drawSprite(ctx, sprite, this.x - camX, this.y - camY);
    }
}
