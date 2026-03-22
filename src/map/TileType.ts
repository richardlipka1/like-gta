export enum TileType {
    GRASS = 0,
    ROAD = 1,
    SIDEWALK = 2,
    BUILDING = 3,
}

export const TILE_COLORS: Record<TileType, string> = {
    [TileType.GRASS]: '#3a7a3a',
    [TileType.ROAD]: '#555555',
    [TileType.SIDEWALK]: '#aaaaaa',
    [TileType.BUILDING]: '#888888',
};
