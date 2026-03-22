export abstract class Entity {
    x: number = 0;
    y: number = 0;
    width: number = 16;
    height: number = 16;
    active: boolean = true;

    update(_dt: number): void {}
    abstract draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void;
}
