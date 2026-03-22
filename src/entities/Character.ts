import { Entity } from './Entity';
import { PIXEL_SIZE } from '../constants';

export type Direction = 'up' | 'down' | 'left' | 'right';

export abstract class Character extends Entity {
    health: number = 100;
    maxHealth: number = 100;
    speed: number = 80;
    direction: Direction = 'down';

    protected drawSprite(ctx: CanvasRenderingContext2D, sprite: (string | null)[][], sx: number, sy: number): void {
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                const color = sprite[row][col];
                if (color !== null) {
                    ctx.fillStyle = color;
                    ctx.fillRect(sx + col * PIXEL_SIZE, sy + row * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
                }
            }
        }
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) this.active = false;
    }
}
