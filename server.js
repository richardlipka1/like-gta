const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// ── Game constants ────────────────────────────────────────────────────────────
const TILE_PX = 64;
const FLAG_X = 20 * TILE_PX; // centre of 40-tile-wide map
const FLAG_Y = 15 * TILE_PX; // centre of 30-tile-tall map
const FLAG_WIN_TIME = 60;    // seconds to hold the flag for a win
const FLAG_PICKUP_DISTANCE = 80; // pixels within which a player can pick up the flag

// ── Server state ──────────────────────────────────────────────────────────────
/** @type {Record<string, {id:string,name:string,team:'blue'|'red',x:number,y:number,direction:string,health:number,hasFlag:boolean,active:boolean}>} */
const players = {};
let flag = { x: FLAG_X, y: FLAG_Y, heldBy: /** @type {string|null} */ (null) };
let flagTimer = 0;
/** @type {ReturnType<typeof setInterval>|null} */
let flagInterval = null;

function resetGame() {
    flag.x = FLAG_X;
    flag.y = FLAG_Y;
    flag.heldBy = null;
    flagTimer = 0;
    if (flagInterval) { clearInterval(flagInterval); flagInterval = null; }
    for (const p of Object.values(players)) {
        p.hasFlag = false;
        p.health = 100;
        p.active = true;
        p.x = p.team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
        p.y = 15 * TILE_PX;
    }
    io.emit('gameReset', { players, flag, flagTimer });
}

function dropFlag(socketId) {
    if (flag.heldBy !== socketId) return;
    const holder = players[socketId];
    flag.heldBy = null;
    if (holder) {
        flag.x = holder.x;
        flag.y = holder.y;
        holder.hasFlag = false;
    }
    flagTimer = 0;
    if (flagInterval) { clearInterval(flagInterval); flagInterval = null; }
    io.emit('flagDropped', { x: flag.x, y: flag.y });
    io.emit('flagTimer', { time: 0 });
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    // Send current state to the newly connected client
    socket.emit('init', { players, flag, flagTimer });

    socket.on('join', ({ name, team }) => {
        const startX = team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
        players[socket.id] = {
            id: socket.id,
            name: String(name).slice(0, 20),
            team,
            x: startX,
            y: 15 * TILE_PX,
            direction: 'down',
            health: 100,
            hasFlag: false,
            active: true,
        };
        io.emit('playerJoined', players[socket.id]);
    });

    socket.on('playerUpdate', ({ x, y, direction, health }) => {
        const p = players[socket.id];
        if (!p) return;
        p.x = x;
        p.y = y;
        p.direction = direction;
        p.health = health;
        socket.broadcast.emit('playerMoved', {
            id: socket.id, x, y, direction,
            health, hasFlag: p.hasFlag,
        });
    });

    socket.on('shoot', ({ x, y, dx, dy }) => {
        const p = players[socket.id];
        if (!p) return;
        socket.broadcast.emit('bulletFired', {
            id: socket.id, team: p.team, x, y, dx, dy,
        });
    });

    socket.on('pickupFlag', () => {
        const p = players[socket.id];
        if (!p || flag.heldBy !== null) return;
        const dist = Math.hypot(p.x - flag.x, p.y - flag.y);
        if (dist > FLAG_PICKUP_DISTANCE) return;

        flag.heldBy = socket.id;
        p.hasFlag = true;
        io.emit('flagPickedUp', { playerId: socket.id });

        if (!flagInterval) {
            flagInterval = setInterval(() => {
                if (!flag.heldBy) {
                    clearInterval(flagInterval);
                    flagInterval = null;
                    return;
                }
                flagTimer++;
                io.emit('flagTimer', { time: flagTimer });
                if (flagTimer >= FLAG_WIN_TIME) {
                    const winner = players[flag.heldBy];
                    if (winner) {
                        io.emit('teamWins', { team: winner.team });
                    }
                    resetGame();
                }
            }, 1000);
        }
    });

    socket.on('hitPlayer', ({ targetId, damage }) => {
        const target = players[targetId];
        const shooter = players[socket.id];
        if (!target || !shooter) return;
        // Validate teams are different (basic anti-grief)
        if (target.team === shooter.team) return;
        target.health = Math.max(0, target.health - damage);
        io.emit('playerMoved', {
            id: targetId,
            x: target.x, y: target.y,
            direction: target.direction,
            health: target.health,
            hasFlag: target.hasFlag,
        });
        if (target.health <= 0 && target.active) {
            target.active = false;
            dropFlag(targetId);
            io.emit('playerDied', { id: targetId });
        }
    });

    socket.on('playerDied', () => {
        const p = players[socket.id];
        if (!p) return;
        dropFlag(socket.id);
        p.active = false;
        p.health = 0;
        io.emit('playerDied', { id: socket.id });
    });

    socket.on('respawn', () => {
        const p = players[socket.id];
        if (!p) return;
        p.x = p.team === 'blue' ? 5 * TILE_PX : 35 * TILE_PX;
        p.y = 15 * TILE_PX;
        p.health = 100;
        p.active = true;
        io.emit('playerRespawned', { id: socket.id, x: p.x, y: p.y });
    });

    socket.on('requestRestart', () => {
        resetGame();
    });

    socket.on('disconnect', () => {
        console.log('disconnected:', socket.id);
        dropFlag(socket.id);
        delete players[socket.id];
        io.emit('playerLeft', { id: socket.id });
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running → http://localhost:${PORT}`);
    console.log('Build the client first with:  npm run build');
});
