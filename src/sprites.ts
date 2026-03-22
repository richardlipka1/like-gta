export function makeSprite(rows: string[], colors: Record<string, string>): (string | null)[][] {
    return rows.map(row => row.split('').map(c => c === '.' ? null : (colors[c] ?? '#ff00ff')));
}

export const PLAYER_SPRITES: Record<string, (string | null)[][]> = {
    down: makeSprite(
        ['..hhhh..', '.hSSSh..', '.SBBS...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
        { h: '#4a2c0a', S: '#f5c99c', B: '#2255aa', l: '#1a1a4e' }
    ),
    up: makeSprite(
        ['..hhhh..', '.hBBBh..', '.BBBB...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
        { h: '#4a2c0a', S: '#f5c99c', B: '#2255aa', l: '#1a1a4e' }
    ),
    right: makeSprite(
        ['.hh.....', '.hSh....', '..BBB...', '..BBB...', '..BBl...', '..lll...', '..ll....', '........'],
        { h: '#4a2c0a', S: '#f5c99c', B: '#2255aa', l: '#1a1a4e' }
    ),
    left: makeSprite(
        ['.....hh.', '....hSh.', '...BBB..', '...BBB..', '...lBB..', '...lll..', '....ll..', '........'],
        { h: '#4a2c0a', S: '#f5c99c', B: '#2255aa', l: '#1a1a4e' }
    ),
};

export const POLICEMAN_SPRITES: Record<string, (string | null)[][]> = {
    down: makeSprite(
        ['..hhhh..', '.hSSSh..', '.SBBS...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
        { h: '#0a0a3a', S: '#f5c99c', B: '#1a3a7a', l: '#1a1a4e' }
    ),
    up: makeSprite(
        ['..hhhh..', '.hBBBh..', '.BBBB...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
        { h: '#0a0a3a', S: '#f5c99c', B: '#1a3a7a', l: '#1a1a4e' }
    ),
    right: makeSprite(
        ['.hh.....', '.hSh....', '..BBB...', '..BBB...', '..BBl...', '..lll...', '..ll....', '........'],
        { h: '#0a0a3a', S: '#f5c99c', B: '#1a3a7a', l: '#1a1a4e' }
    ),
    left: makeSprite(
        ['.....hh.', '....hSh.', '...BBB..', '...BBB..', '...lBB..', '...lll..', '....ll..', '........'],
        { h: '#0a0a3a', S: '#f5c99c', B: '#1a3a7a', l: '#1a1a4e' }
    ),
};

function makePedSprites(shirtColor: string): Record<string, (string | null)[][]> {
    return {
        down: makeSprite(
            ['..hhhh..', '.hSSSh..', '.SBBS...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
            { h: '#4a2c0a', S: '#f5c99c', B: shirtColor, l: '#1a1a4e' }
        ),
        up: makeSprite(
            ['..hhhh..', '.hBBBh..', '.BBBB...', '.BBBB...', '.BBBB...', '.BllB...', '.ll.ll..', '........'],
            { h: '#4a2c0a', S: '#f5c99c', B: shirtColor, l: '#1a1a4e' }
        ),
        right: makeSprite(
            ['.hh.....', '.hSh....', '..BBB...', '..BBB...', '..BBl...', '..lll...', '..ll....', '........'],
            { h: '#4a2c0a', S: '#f5c99c', B: shirtColor, l: '#1a1a4e' }
        ),
        left: makeSprite(
            ['.....hh.', '....hSh.', '...BBB..', '...BBB..', '...lBB..', '...lll..', '....ll..', '........'],
            { h: '#4a2c0a', S: '#f5c99c', B: shirtColor, l: '#1a1a4e' }
        ),
    };
}

export const PEDESTRIAN_SPRITES: Record<string, (string | null)[][]>[] = [
    makePedSprites('#aa2222'),
    makePedSprites('#22aa22'),
    makePedSprites('#aa22aa'),
];
