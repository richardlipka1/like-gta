import { TileType, TILE_COLORS } from './TileType';
import { Building } from './Building';
import { Hospital } from './buildings/Hospital';
import { PoliceStation } from './buildings/PoliceStation';
import { Post } from './buildings/Post';
import { Block } from './buildings/Block';
import { Street } from './Street';
import { MAP_TILES_W, MAP_TILES_H, TILE_PX } from '../constants';
import type { Car } from '../entities/vehicles/Car';
import type { Pedestrian } from '../entities/Pedestrian';

export class GameMap {
    tiles: TileType[][] = [];
    buildings: Building[] = [];
    streets: Street[] = [];
    cars: Car[] = [];
    pedestrians: Pedestrian[] = [];

    generate(): void {
        this.tiles = Array.from({ length: MAP_TILES_H }, () => Array(MAP_TILES_W).fill(TileType.GRASS));

        const roadRows: [number, number][] = [[5, 6], [15, 16], [25, 26]];
        const roadCols: [number, number][] = [[5, 6], [15, 16], [25, 26], [35, 36]];

        for (const [r1, r2] of roadRows) {
            for (let c = 0; c < MAP_TILES_W; c++) {
                this.tiles[r1][c] = TileType.ROAD;
                this.tiles[r2][c] = TileType.ROAD;
            }
            if (r1 > 0) for (let c = 0; c < MAP_TILES_W; c++) this.tiles[r1 - 1][c] = TileType.SIDEWALK;
            if (r2 < MAP_TILES_H - 1) for (let c = 0; c < MAP_TILES_W; c++) this.tiles[r2 + 1][c] = TileType.SIDEWALK;
        }

        for (const [c1, c2] of roadCols) {
            for (let r = 0; r < MAP_TILES_H; r++) {
                this.tiles[r][c1] = TileType.ROAD;
                this.tiles[r][c2] = TileType.ROAD;
            }
            if (c1 > 0) {
                for (let r = 0; r < MAP_TILES_H; r++) {
                    if (this.tiles[r][c1 - 1] === TileType.GRASS) this.tiles[r][c1 - 1] = TileType.SIDEWALK;
                }
            }
            if (c2 < MAP_TILES_W - 1) {
                for (let r = 0; r < MAP_TILES_H; r++) {
                    if (this.tiles[r][c2 + 1] === TileType.GRASS) this.tiles[r][c2 + 1] = TileType.SIDEWALK;
                }
            }
        }

        this.buildings = [
            new PoliceStation(8, 8, 6, 4),
            new Hospital(18, 8, 6, 4),
            new Post(28, 8, 4, 4),
            new Block(8, 18, 5, 5, '#887766', 'BLOCK'),
            new Block(18, 18, 5, 5, '#776688', 'BLOCK'),
            new Block(28, 18, 4, 5, '#668877', 'BLOCK'),
            new Block(8, 1, 4, 3, '#998877', 'SHOP'),
            new Block(14, 1, 4, 3, '#889977', 'GAS'),
            new Block(20, 1, 4, 3, '#779988', 'STORE'),
            new Block(28, 1, 4, 3, '#887799', 'BANK'),
        ];

        for (const b of this.buildings) {
            for (let r = b.y; r < b.y + b.height; r++) {
                for (let c = b.x; c < b.x + b.width; c++) {
                    if (r >= 0 && r < MAP_TILES_H && c >= 0 && c < MAP_TILES_W) {
                        this.tiles[r][c] = TileType.BUILDING;
                    }
                }
            }
        }

        for (const [r1] of roadRows) {
            this.streets.push(new Street(0, r1, MAP_TILES_W, true));
        }
        for (const [c1] of roadCols) {
            this.streets.push(new Street(c1, 0, MAP_TILES_H, false));
        }
    }

    drawTiles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
        const startCol = Math.floor(camX / TILE_PX);
        const startRow = Math.floor(camY / TILE_PX);
        const endCol = Math.min(MAP_TILES_W, startCol + Math.ceil(800 / TILE_PX) + 1);
        const endRow = Math.min(MAP_TILES_H, startRow + Math.ceil(600 / TILE_PX) + 1);

        for (let r = Math.max(0, startRow); r < endRow; r++) {
            for (let c = Math.max(0, startCol); c < endCol; c++) {
                const tile = this.tiles[r][c];
                ctx.fillStyle = TILE_COLORS[tile];
                ctx.fillRect(c * TILE_PX - camX, r * TILE_PX - camY, TILE_PX, TILE_PX);
            }
        }
    }

    isWalkable(worldX: number, worldY: number): boolean {
        const col = Math.floor(worldX / TILE_PX);
        const row = Math.floor(worldY / TILE_PX);
        if (col < 0 || col >= MAP_TILES_W || row < 0 || row >= MAP_TILES_H) return false;
        return this.tiles[row][col] !== TileType.BUILDING;
    }

    isSolid(worldX: number, worldY: number): boolean {
        const col = Math.floor(worldX / TILE_PX);
        const row = Math.floor(worldY / TILE_PX);
        if (col < 0 || col >= MAP_TILES_W || row < 0 || row >= MAP_TILES_H) return true;
        return this.tiles[row][col] === TileType.BUILDING;
    }
}
