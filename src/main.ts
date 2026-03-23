import { Game } from './Game';
import { MultiplayerGame } from './MultiplayerGame';

// ── helpers ───────────────────────────────────────────────────────────────────

function show(id: string): void {
    (document.getElementById(id) as HTMLElement).style.display = '';
}
function hide(id: string): void {
    (document.getElementById(id) as HTMLElement).style.display = 'none';
}
function val(id: string): string {
    return (document.getElementById(id) as HTMLInputElement).value.trim();
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload  = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
    });
}

// ── Single-player ─────────────────────────────────────────────────────────────

document.getElementById('singleBtn')!.addEventListener('click', () => {
    hide('modeSelect');
    show('overlay');
    show('gameCanvas');
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const game = new Game(canvas);
    game.init();
});

// ── Multiplayer ───────────────────────────────────────────────────────────────

document.getElementById('multiBtn')!.addEventListener('click', () => {
    hide('modeSelect');
    show('multiLobby');
});

document.getElementById('lobbyBack')!.addEventListener('click', () => {
    hide('multiLobby');
    show('modeSelect');
});

document.getElementById('joinBtn')!.addEventListener('click', async () => {
    const name      = val('playerName') || 'Player';
    const team      = (document.getElementById('teamColor') as HTMLSelectElement).value as 'blue' | 'red';
    const serverUrl = val('serverUrl') || 'http://localhost:3000';
    const errEl     = document.getElementById('lobbyError') as HTMLElement;

    errEl.textContent = 'Connecting…';

    try {
        await loadScript(`${serverUrl}/socket.io/socket.io.js`);
    } catch {
        errEl.textContent = `Could not reach server at ${serverUrl}. Make sure "npm start" is running.`;
        return;
    }

    errEl.textContent = '';
    hide('multiLobby');
    hide('overlay');
    show('gameCanvas');

    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const game = new MultiplayerGame(canvas, name, team, serverUrl);
    game.init();
});

