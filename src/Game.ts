import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_PX, WORLD_W, WORLD_H } from './constants';
import { InputHandler } from './InputHandler';
import { Camera } from './Camera';
import { GameMap } from './map/GameMap';
import { Player } from './entities/Player';
import { Policeman } from './entities/Policeman';
import { Bullet } from './entities/Bullet';
import { Renderer } from './Renderer';
import { VWBeetle } from './entities/vehicles/VWBeetle';
import { Porsche } from './entities/vehicles/Porsche';
import { PoliceCar } from './entities/vehicles/PoliceCar';
import { Van } from './entities/vehicles/Van';
import { Ambulance } from './entities/vehicles/Ambulance';
import { Pedestrian } from './entities/Pedestrian';
import { SoundManager } from './SoundManager';

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: InputHandler;
    camera: Camera;
    map: GameMap;
    player: Player;
    police: Policeman[] = [];
    bullets: Bullet[] = [];
    running: boolean = false;
    score: number = 0;
    private renderer: Renderer;
    private lastTime: number = 0;
    private gameOverTimer: number = 0;
    private gameOver: boolean = false;
    private sounds: SoundManager;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.input = new InputHandler();
        this.camera = new Camera();
        this.map = new GameMap();
        this.player = new Player(10 * TILE_PX, 10 * TILE_PX);
        this.renderer = new Renderer(this.ctx);
        this.sounds = new SoundManager();
    }

    init(): void {
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.initializeEntities();
        this.running = true;
        requestAnimationFrame(t => this.gameLoop(t));
    }

    private static readonly PED_POSITIONS = [
        [7, 12], [9, 12], [12, 12], [20, 12], [22, 12],
        [30, 12], [7, 20], [20, 20], [30, 20],
    ];

    private initializeEntities(): void {
        this.map.generate();

        for (let i = 0; i < Game.PED_POSITIONS.length; i++) {
            const [tx, ty] = Game.PED_POSITIONS[i];
            this.map.pedestrians.push(new Pedestrian(tx * TILE_PX, ty * TILE_PX, i % 3));
        }

        const beetle = new VWBeetle(12 * TILE_PX, 5 * TILE_PX);
        beetle.npcVelocityX = 70;
        this.map.cars.push(beetle);

        const porsche = new Porsche(20 * TILE_PX, 5 * TILE_PX);
        porsche.npcVelocityX = -90;
        this.map.cars.push(porsche);

        const van = new Van(9 * TILE_PX, 15 * TILE_PX);
        van.npcVelocityX = 55;
        this.map.cars.push(van);

        const ambulance = new Ambulance(22 * TILE_PX, 15 * TILE_PX);
        ambulance.npcVelocityX = -65;
        this.map.cars.push(ambulance);

        const policeCar = new PoliceCar(30 * TILE_PX, 15 * TILE_PX);
        policeCar.npcVelocityX = 80;
        this.map.cars.push(policeCar);

        this.police.push(new Policeman(12 * TILE_PX, 12 * TILE_PX, this.player));
        this.police.push(new Policeman(20 * TILE_PX, 20 * TILE_PX, this.player));
        this.police.push(new Policeman(30 * TILE_PX, 10 * TILE_PX, this.player));
    }

    private gameLoop(timestamp: number): void {
        // Cap delta time to 50ms to prevent physics issues on frame drops or tab focus
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();
        this.input.clearJustPressed();

        requestAnimationFrame(t => this.gameLoop(t));
    }

    update(dt: number): void {
        if (this.gameOver) {
            this.gameOverTimer += dt;
            if (this.gameOverTimer > 3 || this.input.justPressed('r') || this.input.justPressed('R')) {
                this.reset();
            }
            return;
        }

        // Use if/else so entering and exiting a car cannot happen in the same frame
        if (this.player.inCar) {
            const prevX = this.player.inCar.x;
            const prevY = this.player.inCar.y;
            this.player.inCar.handleInput(this.input, dt);
            const isMoving = this.player.inCar.x !== prevX || this.player.inCar.y !== prevY;
            this.sounds.updateEngine(isMoving);

            if (this.input.justPressed('h') || this.input.justPressed('H')) {
                this.sounds.playHorn();
            }

            if (this.input.justPressed('e') || this.input.justPressed('E')) {
                const car = this.player.inCar;
                this.player.inCar = null;
                car.exit();
                this.sounds.stopEngine();
            }
        } else {
            const prevX = this.player.x;
            const prevY = this.player.y;
            const bulletsBefore = this.bullets.length;
            this.player.handleInput(this.input, dt, this.bullets, () => this.handleEnterCar());
            const isWalking = this.player.x !== prevX || this.player.y !== prevY;
            this.sounds.updateWalk(isWalking, dt);
            if (this.bullets.length > bulletsBefore) {
                this.sounds.playShoot();
            }
        }

        this.player.update(dt);
        this.clampToWorld(this.player);

        if (!this.player.inCar) {
            this.resolvePlayerBuildingCollision();
        }

        for (const cop of this.police) {
            cop.updateWithBullets(dt, this.bullets);
            this.clampToWorld(cop);
        }

        for (const ped of this.map.pedestrians) {
            ped.update(dt);
            this.clampToWorld(ped);
        }

        for (const car of this.map.cars) {
            car.updateNpc(dt, (x, y) => this.map.isRoad(x, y));
        }

        for (const b of this.bullets) {
            b.update(dt);
            if (this.map.isSolid(b.x, b.y)) b.active = false;
            if (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) b.active = false;
        }

        this.checkCollisions();

        this.bullets = this.bullets.filter(b => b.active);
        this.police = this.police.filter(c => c.active);

        if (this.player.starLevel > 0 && this.police.length < this.player.starLevel * 2) {
            this.spawnPolice();
        }

        this.score += Math.floor(dt * 10);

        if (this.player.inCar) {
            this.camera.follow(this.player.inCar.x, this.player.inCar.y, this.player.inCar.width, this.player.inCar.height);
        } else {
            this.camera.follow(this.player.x, this.player.y, this.player.width, this.player.height);
        }

        if (!this.player.active && this.player.health <= 0) {
            this.player.lives--;
            if (this.player.lives <= 0) {
                this.gameOver = true;
                this.gameOverTimer = 0;
            } else {
                this.player.health = this.player.maxHealth;
                this.player.active = true;
                this.player.x = 10 * TILE_PX;
                this.player.y = 10 * TILE_PX;
                this.player.starLevel = 0;
            }
        }
    }

    private handleEnterCar(): void {
        if (this.player.inCar) return;
        for (const car of this.map.cars) {
            if (car.canEnter(this.player)) {
                car.enter(this.player);
                this.player.inCar = car;
                this.sounds.startEngine();
                break;
            }
        }
    }

    private resolvePlayerBuildingCollision(): void {
        for (const building of this.map.buildings) {
            if (building.collidesWith(this.player.x, this.player.y, this.player.width, this.player.height)) {
                const b = building.getPixelBounds();
                const overlapLeft = (this.player.x + this.player.width) - b.x;
                const overlapRight = (b.x + b.w) - this.player.x;
                const overlapTop = (this.player.y + this.player.height) - b.y;
                const overlapBottom = (b.y + b.h) - this.player.y;
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                if (minOverlap === overlapLeft) this.player.x = b.x - this.player.width;
                else if (minOverlap === overlapRight) this.player.x = b.x + b.w;
                else if (minOverlap === overlapTop) this.player.y = b.y - this.player.height;
                else this.player.y = b.y + b.h;
            }
        }
    }

    private clampToWorld(entity: { x: number; y: number; width: number; height: number }): void {
        entity.x = Math.max(0, Math.min(entity.x, WORLD_W - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, WORLD_H - entity.height));
    }

    checkCollisions(): void {
        for (const bullet of this.bullets) {
            if (!bullet.active) continue;
            if (bullet.owner === 'player') {
                for (const cop of this.police) {
                    if (!cop.active) continue;
                    if (this.overlaps(bullet, cop)) {
                        cop.takeDamage(bullet.damage);
                        bullet.active = false;
                        this.score += 100;
                        break;
                    }
                }
            }
            if (bullet.owner === 'police') {
                if (!this.player.inCar && this.overlaps(bullet, this.player)) {
                    this.player.takeDamage(bullet.damage);
                    bullet.active = false;
                    if (this.player.starLevel < 5) this.player.starLevel++;
                }
            }
        }
    }

    private overlaps(
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number }
    ): boolean {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    spawnPolice(): void {
        const roadTiles = [
            [5 * TILE_PX, 5 * TILE_PX],
            [15 * TILE_PX, 15 * TILE_PX],
            [25 * TILE_PX, 25 * TILE_PX],
            [35 * TILE_PX, 5 * TILE_PX],
        ];
        const pos = roadTiles[Math.floor(Math.random() * roadTiles.length)];
        this.police.push(new Policeman(pos[0], pos[1], this.player));
    }

    draw(): void {
        this.renderer.draw(this.map, this.player, this.police, this.bullets, this.camera, this.score);

        if (this.gameOver) {
            const ctx = this.ctx;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#ff2222';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.fillStyle = '#fff';
            ctx.font = '20px monospace';
            ctx.fillText(`Score: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
            ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
            ctx.textAlign = 'left';
        }
    }

    private reset(): void {
        this.sounds.stopEngine();
        this.score = 0;
        this.gameOver = false;
        this.gameOverTimer = 0;
        this.police = [];
        this.bullets = [];
        this.player = new Player(10 * TILE_PX, 10 * TILE_PX);
        this.map = new GameMap();
        this.initializeEntities();
    }
}
