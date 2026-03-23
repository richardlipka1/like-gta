import { GameMap } from './map/GameMap';
import { Player } from './entities/Player';
import { Policeman } from './entities/Policeman';
import { Bullet } from './entities/Bullet';
import { Camera } from './Camera';
import { BloodEffect } from './entities/BloodEffect';
import { ExplosionEffect } from './entities/ExplosionEffect';
import { Heart } from './entities/Heart';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

export class Renderer {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    draw(
        map: GameMap,
        player: Player,
        police: Policeman[],
        bullets: Bullet[],
        bloodEffects: BloodEffect[],
        explosionEffects: ExplosionEffect[],
        hearts: Heart[],
        camera: Camera,
        score: number
    ): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        map.drawTiles(ctx, camera.x, camera.y);

        for (const b of map.buildings) {
            b.draw(ctx, camera.x, camera.y);
        }

        for (const s of map.streets) {
            s.draw(ctx, camera.x, camera.y);
        }

        for (const effect of bloodEffects) {
            effect.draw(ctx, camera.x, camera.y);
        }

        for (const heart of hearts) {
            if (heart.active) heart.draw(ctx, camera.x, camera.y);
        }

        for (const car of map.cars) {
            if (car.active) car.draw(ctx, camera.x, camera.y);
        }

        for (const ped of map.pedestrians) {
            if (ped.active) ped.draw(ctx, camera.x, camera.y);
        }

        for (const cop of police) {
            if (cop.active) cop.draw(ctx, camera.x, camera.y);
        }

        player.draw(ctx, camera.x, camera.y);

        for (const b of bullets) {
            if (b.active) b.draw(ctx, camera.x, camera.y);
        }

        for (const effect of explosionEffects) {
            effect.draw(ctx, camera.x, camera.y);
        }

        this.drawUI(player, score);
    }

    private drawUI(player: Player, score: number): void {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 104, 14);
        ctx.fillStyle = '#22cc22';
        ctx.fillRect(12, 12, (player.health / player.maxHealth) * 100, 10);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 104, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('HP', 14, 21);

        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`Lives: ${player.lives}`, 10, 40);

        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < player.starLevel; i++) {
            ctx.fillText('★', 10 + i * 16, 58);
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 10, 24);
        ctx.textAlign = 'left';
    }
}
