import { Car } from './Car';

export class VWBeetle extends Car {
    color = '#ffdd44';
    carSpeed = 100;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 12 * 4;
        this.height = 6 * 4;
    }
}
