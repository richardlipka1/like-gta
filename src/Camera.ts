import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_W, WORLD_H } from './constants';

export class Camera {
    x: number = 0;
    y: number = 0;

    follow(targetX: number, targetY: number, targetW: number, targetH: number): void {
        this.x = targetX + targetW / 2 - CANVAS_WIDTH / 2;
        this.y = targetY + targetH / 2 - CANVAS_HEIGHT / 2;
        this.x = Math.max(0, Math.min(this.x, WORLD_W - CANVAS_WIDTH));
        this.y = Math.max(0, Math.min(this.y, WORLD_H - CANVAS_HEIGHT));
    }
}
