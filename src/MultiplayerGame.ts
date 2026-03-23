import { CANVAS_WIDTH, CANVAS_HEIGHT, PIXEL_SIZE, TILE_PX, WORLD_W, WORLD_H } from './constants';
import { InputHandler } from './InputHandler';
import { Camera } from './Camera';
import { GameMap } from './map/GameMap';
import { Player } from './entities/Player';
import { Bullet } from './entities/Bullet';
import { BloodEffect } from './entities/BloodEffect';
import { Flag } from './entities/Flag';
import { makeTeamPlayerSprites } from './sprites';

// socket.io is loaded from <script src="/socket.io/socket.io.js"> at runtime.
declare function io(url: string, opts?: Record<string, unknown>): MPSocket;

interface MPSocket {
    id: string;
    on(event: string, cb: (...args: any[]) => void): void;
    emit(event: string, data?: any): void;
    disconnect(): void;
}

interface RemotePlayerData {
    id: string;
    name: string;
    team: 'blue' | 'red';
    x: number;
    y: number;
    direction: string;
    health: number;
    hasFlag: boolean;
    active: boolean;
}

interface FlagData {
    x: number;
    y: number;
    heldBy: string | null;
}

const FLAG_X = 20 * TILE_PX;
const FLAG_Y = 15 * TILE_PX;
const PLAYER_DRAW_SIZE = 8 * PIXEL_SIZE; // pixel size of the player sprite
const FLAG_WIN_TIME = 60;               // seconds to hold the flag to win (must match server.js)

export class MultiplayerGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private input: InputHandler;
    private camera: Camera;
    private map: GameMap;
    private player: Player;
    private bullets: Bullet[] = [];
    private bloodEffects: BloodEffect[] = [];
    private flag: Flag;
    private remotePlayers: Map<string, RemotePlayerData> = new Map();
    private socket: MPSocket | null = null;
    private myId: string = '';
    private playerName: string;
    private team: 'blue' | 'red';
    private serverUrl: string;
    private lastTime: number = 0;
    private flagTimer: number = 0;
    private gameWinner: string | null = null;
    private isDead: boolean = false;
    private deadTimer: number = 0;

    private static readonly RESPAWN_DELAY = 3; // seconds before respawn

    constructor(
        canvas: HTMLCanvasElement,
        playerName: string,
        team: 'blue' | 'red',
        serverUrl: string,
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.input = new InputHandler();
        this.camera = new Camera();
        this.map = new GameMap();
        this.playerName = playerName;
        this.team = team;
        this.serverUrl = serverUrl;

        const startX = team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
        this.player = new Player(startX, 15 * TILE_PX);
        this.player.sprites = makeTeamPlayerSprites(team);

        this.flag = new Flag(FLAG_X, FLAG_Y);
    }

    init(): void {
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.map.generate();
        this.connectToServer();
        requestAnimationFrame(t => this.gameLoop(t));
    }

    // ── Socket.io connection ──────────────────────────────────────────────────

    private connectToServer(): void {
        this.socket = io(this.serverUrl);

        this.socket.on('connect', () => {
            this.myId = this.socket!.id;
            this.socket!.emit('join', { name: this.playerName, team: this.team });
        });

        this.socket.on('init', (data: { players: Record<string, RemotePlayerData>; flag: FlagData; flagTimer: number }) => {
            for (const [id, rp] of Object.entries(data.players)) {
                if (id !== this.myId) this.remotePlayers.set(id, rp);
            }
            this.flag.x = data.flag.x;
            this.flag.y = data.flag.y;
            this.flag.heldBy = data.flag.heldBy;
            this.flagTimer = data.flagTimer;
        });

        this.socket.on('playerJoined', (rp: RemotePlayerData) => {
            if (rp.id !== this.myId) this.remotePlayers.set(rp.id, rp);
        });

        this.socket.on('playerMoved', (data: RemotePlayerData & { id: string }) => {
            const rp = this.remotePlayers.get(data.id);
            if (rp) {
                rp.x = data.x; rp.y = data.y;
                rp.direction = data.direction;
                rp.health = data.health;
                rp.hasFlag = data.hasFlag;
            }
        });

        this.socket.on('playerLeft', (data: { id: string }) => {
            this.remotePlayers.delete(data.id);
        });

        this.socket.on('flagPickedUp', (data: { playerId: string }) => {
            this.flag.heldBy = data.playerId;
        });

        this.socket.on('flagDropped', (data: { x: number; y: number }) => {
            this.flag.heldBy = null;
            this.flag.x = data.x;
            this.flag.y = data.y;
        });

        this.socket.on('flagTimer', (data: { time: number }) => {
            this.flagTimer = data.time;
        });

        this.socket.on('teamWins', (data: { team: string }) => {
            this.gameWinner = data.team;
        });

        this.socket.on('playerDied', (data: { id: string }) => {
            const rp = this.remotePlayers.get(data.id);
            if (rp) { rp.active = false; rp.hasFlag = false; }
        });

        this.socket.on('playerRespawned', (data: { id: string; x: number; y: number }) => {
            const rp = this.remotePlayers.get(data.id);
            if (rp) { rp.x = data.x; rp.y = data.y; rp.active = true; rp.health = 100; }
        });

        this.socket.on('bulletFired', (data: { id: string; team: string; x: number; y: number; dx: number; dy: number }) => {
            if (data.id === this.myId) return; // already created locally
            this.bullets.push(new Bullet(data.x, data.y, data.dx, data.dy, 'opponent'));
        });

        this.socket.on('gameReset', (data: { players: Record<string, RemotePlayerData>; flag: FlagData; flagTimer: number }) => {
            this.gameWinner = null;
            this.flagTimer = 0;
            this.flag.x = data.flag.x;
            this.flag.y = data.flag.y;
            this.flag.heldBy = null;
            // Respawn local player
            const startX = this.team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
            this.player.x = startX;
            this.player.y = 15 * TILE_PX;
            this.player.health = this.player.maxHealth;
            this.player.active = true;
            this.isDead = false;
            this.deadTimer = 0;
            // Update remote players
            for (const [id, rp] of Object.entries(data.players)) {
                if (id !== this.myId) this.remotePlayers.set(id, rp);
            }
        });
    }

    // ── Game loop ─────────────────────────────────────────────────────────────

    private gameLoop(timestamp: number): void {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        this.input.clearJustPressed();
        requestAnimationFrame(t => this.gameLoop(t));
    }

    update(dt: number): void {
        if (this.gameWinner) {
            if (this.input.justPressed('r') || this.input.justPressed('R')) {
                this.socket?.emit('requestRestart');
            }
            return;
        }

        // Dead / respawning
        if (this.isDead) {
            this.deadTimer += dt;
            if (this.deadTimer >= MultiplayerGame.RESPAWN_DELAY) {
                this.isDead = false;
                this.deadTimer = 0;
                const startX = this.team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
                this.player.x = startX;
                this.player.y = 15 * TILE_PX;
                this.player.health = this.player.maxHealth;
                this.player.active = true;
                this.socket?.emit('respawn');
            }
            return;
        }

        // ── Local player input ────────────────────────────────────────────────
        const prevX = this.player.x;
        const prevY = this.player.y;
        const bulletsBefore = this.bullets.length;

        this.player.handleInput(this.input, dt, this.bullets, () => { /* no cars */ });

        // Broadcast newly fired bullets to server
        if (this.bullets.length > bulletsBefore) {
            const b = this.bullets[this.bullets.length - 1];
            this.socket?.emit('shoot', { x: b.x, y: b.y, dx: b.dx, dy: b.dy });
        }

        this.player.update(dt);
        this.clampToWorld(this.player);
        this.resolvePlayerBuildingCollision();

        // Send position when anything changed
        if (this.player.x !== prevX || this.player.y !== prevY || this.bullets.length !== bulletsBefore) {
            this.socket?.emit('playerUpdate', {
                x: this.player.x,
                y: this.player.y,
                direction: this.player.direction,
                health: this.player.health,
            });
        }

        // ── Bullet updates ────────────────────────────────────────────────────
        for (const b of this.bullets) {
            b.update(dt);
            if (this.map.isSolid(b.x, b.y)) b.active = false;
            if (b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) b.active = false;
        }

        this.checkBulletCollisions();

        // ── Flag pickup ───────────────────────────────────────────────────────
        if (this.flag.heldBy === null && !this.isDead) {
            if (this.overlaps(this.player, this.flag)) {
                this.socket?.emit('pickupFlag');
            }
        }

        // ── Effect updates ────────────────────────────────────────────────────
        for (const e of this.bloodEffects) e.update(dt);
        this.bullets = this.bullets.filter(b => b.active);
        this.bloodEffects = this.bloodEffects.filter(e => e.active);

        // ── Camera ────────────────────────────────────────────────────────────
        this.camera.follow(this.player.x, this.player.y, this.player.width, this.player.height);

        // ── Player death ──────────────────────────────────────────────────────
        if (!this.player.active && this.player.health <= 0 && !this.isDead) {
            this.isDead = true;
            this.deadTimer = 0;
            if (this.flag.heldBy === this.myId) {
                this.flag.heldBy = null;
            }
            this.socket?.emit('playerDied');
        }
    }

    private checkBulletCollisions(): void {
        for (const bullet of this.bullets) {
            if (!bullet.active) continue;

            // Our bullets can hit opponents
            if (bullet.owner === 'player') {
                for (const [id, rp] of this.remotePlayers) {
                    if (!rp.active) continue;
                    if (rp.team === this.team) continue; // no team-kill
                    const rpRect = { x: rp.x, y: rp.y, width: PLAYER_DRAW_SIZE, height: PLAYER_DRAW_SIZE };
                    if (this.overlaps(bullet, rpRect)) {
                        bullet.active = false;
                        this.bloodEffects.push(new BloodEffect(rp.x + rpRect.width / 2, rp.y + rpRect.height / 2));
                        this.socket?.emit('hitPlayer', { targetId: id, damage: bullet.damage });
                        break;
                    }
                }
            }

            // Opponent bullets can hit us
            if (bullet.owner === 'opponent') {
                if (this.overlaps(bullet, this.player)) {
                    bullet.active = false;
                    this.player.takeDamage(bullet.damage);
                    this.bloodEffects.push(new BloodEffect(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
                    ));
                }
            }
        }
    }

    private resolvePlayerBuildingCollision(): void {
        for (const building of this.map.buildings) {
            if (building.collidesWith(this.player.x, this.player.y, this.player.width, this.player.height)) {
                const b = building.getPixelBounds();
                const overlapLeft   = (this.player.x + this.player.width)  - b.x;
                const overlapRight  = (b.x + b.w) - this.player.x;
                const overlapTop    = (this.player.y + this.player.height) - b.y;
                const overlapBottom = (b.y + b.h) - this.player.y;
                const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                if (min === overlapLeft)  this.player.x = b.x - this.player.width;
                else if (min === overlapRight)  this.player.x = b.x + b.w;
                else if (min === overlapTop)    this.player.y = b.y - this.player.height;
                else                            this.player.y = b.y + b.h;
            }
        }
    }

    private clampToWorld(entity: { x: number; y: number; width: number; height: number }): void {
        entity.x = Math.max(0, Math.min(entity.x, WORLD_W - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, WORLD_H - entity.height));
    }

    private overlaps(
        a: { x: number; y: number; width: number; height: number },
        b: { x: number; y: number; width: number; height: number },
    ): boolean {
        return a.x < b.x + b.width && a.x + a.width > b.x &&
               a.y < b.y + b.height && a.y + a.height > b.y;
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    draw(): void {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.map.drawTiles(ctx, this.camera.x, this.camera.y);
        for (const b of this.map.buildings) b.draw(ctx, this.camera.x, this.camera.y);
        for (const s of this.map.streets)   s.draw(ctx, this.camera.x, this.camera.y);

        for (const e of this.bloodEffects) e.draw(ctx, this.camera.x, this.camera.y);

        // Flag (only when not being carried)
        if (this.flag.heldBy === null) {
            this.flag.draw(ctx, this.camera.x, this.camera.y);
        }

        // Remote players
        for (const [, rp] of this.remotePlayers) {
            if (rp.active) this.drawRemotePlayer(ctx, rp);
        }

        // Local player
        if (!this.isDead) {
            this.player.draw(ctx, this.camera.x, this.camera.y);
            if (this.flag.heldBy === this.myId) {
                this.drawFlagOnPlayer(ctx, this.player.x, this.player.y);
            }
            this.drawLabel(ctx, this.playerName, this.player.x, this.player.y, this.team, true);
        }

        // Bullets
        for (const b of this.bullets) {
            if (b.active) b.draw(ctx, this.camera.x, this.camera.y);
        }

        this.drawHUD(ctx);

        if (this.gameWinner) this.drawWinScreen(ctx);
        if (this.isDead)     this.drawDeadScreen(ctx);
    }

    private drawRemotePlayer(ctx: CanvasRenderingContext2D, rp: RemotePlayerData): void {
        const sx = rp.x - this.camera.x;
        const sy = rp.y - this.camera.y;
        const size = PLAYER_DRAW_SIZE;

        // Body (team-coloured rectangle — a full sprite sheet would require
        // passing the sprite data over the network; simplified visuals here)
        ctx.fillStyle = rp.team === 'blue' ? '#2255aa' : '#cc2222';
        ctx.fillRect(sx, sy, size, size);

        // Head highlight
        ctx.fillStyle = '#f5c99c';
        ctx.fillRect(sx + 8, sy + 2, 8, 8);

        // Health bar
        const barW = size + 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(sx - 2, sy - 9, barW, 5);
        ctx.fillStyle = rp.team === 'blue' ? '#4488ff' : '#ff4444';
        ctx.fillRect(sx - 2, sy - 9, Math.max(0, (rp.health / 100) * barW), 5);

        // Flag indicator
        if (rp.hasFlag) this.drawFlagOnPlayer(ctx, rp.x, rp.y);

        // Name tag
        this.drawLabel(ctx, rp.name, rp.x, rp.y, rp.team, false);
    }

    /** Draw a small flag above a player (world coords → screen via camera). */
    private drawFlagOnPlayer(ctx: CanvasRenderingContext2D, wx: number, wy: number): void {
        const sx = wx - this.camera.x;
        const sy = wy - this.camera.y;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(sx + 18, sy - 14, 3, 16);
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(sx + 21, sy - 14, 12, 8);
    }

    /** Draw player name tag in team colour. */
    private drawLabel(
        ctx: CanvasRenderingContext2D,
        name: string,
        wx: number,
        wy: number,
        team: 'blue' | 'red',
        isLocal: boolean,
    ): void {
        const sx = wx - this.camera.x + PLAYER_DRAW_SIZE / 2;
        const sy = wy - this.camera.y - 18;
        ctx.font = isLocal ? 'bold 11px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(name, sx + 1, sy + 1);
        ctx.fillStyle = team === 'blue' ? '#88ccff' : '#ff8888';
        ctx.fillText(name, sx, sy);
        ctx.textAlign = 'left';
    }

    private drawHUD(ctx: CanvasRenderingContext2D): void {
        // ── Health bar ────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 104, 14);
        ctx.fillStyle = this.team === 'blue' ? '#2255dd' : '#cc2222';
        ctx.fillRect(12, 12, (this.player.health / this.player.maxHealth) * 100, 10);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, 104, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('HP', 14, 21);

        // ── Team label ────────────────────────────────────────────────────────
        ctx.fillStyle = this.team === 'blue' ? '#4488ff' : '#ff4444';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`TEAM: ${this.team.toUpperCase()}`, 10, 44);

        // ── Flag timer banner ─────────────────────────────────────────────────
        if (this.flag.heldBy !== null) {
            const isHolder = this.flag.heldBy === this.myId;
            const holderRp = this.remotePlayers.get(this.flag.heldBy);
            const holderName = isHolder ? this.playerName : (holderRp?.name ?? '???');
            const holderTeam = isHolder ? this.team : (holderRp?.team ?? 'blue');
            const remaining  = Math.max(0, FLAG_WIN_TIME - this.flagTimer);

            ctx.fillStyle = 'rgba(0,0,0,0.72)';
            ctx.fillRect(CANVAS_WIDTH / 2 - 130, 8, 260, 44);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffdd00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`\u{1F6A9} ${holderName} has the flag!`, CANVAS_WIDTH / 2, 26);
            ctx.fillStyle = holderTeam === 'blue' ? '#4488ff' : '#ff4444';
            ctx.font = '12px monospace';
            ctx.fillText(`${remaining}s until ${holderTeam.toUpperCase()} team wins`, CANVAS_WIDTH / 2, 44);
            ctx.textAlign = 'left';
        }

        // ── Player count ──────────────────────────────────────────────────────
        ctx.fillStyle = '#ccc';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Players: ${this.remotePlayers.size + 1}`, CANVAS_WIDTH - 10, 24);
        ctx.textAlign = 'left';
    }

    private drawWinScreen(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const isMyTeam = this.gameWinner === this.team;
        ctx.fillStyle = isMyTeam ? '#ffdd00' : '#ff4444';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            isMyTeam ? 'YOUR TEAM WINS! 🎉' : `${(this.gameWinner ?? '').toUpperCase()} TEAM WINS!`,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20,
        );
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText('Press R to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
    }

    private drawDeadScreen(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ff2222';
        ctx.font = 'bold 40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        const respawnIn = Math.ceil(MultiplayerGame.RESPAWN_DELAY - this.deadTimer);
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.fillText(`Respawning in ${respawnIn}s…`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
    }
}
