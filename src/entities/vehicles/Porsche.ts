import { Car } from './Car';

export class Porsche extends Car {
    color = '#cc2222';
    carSpeed = 160;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 14 * 4;
        this.height = 5 * 4;
    }
}
