import { Car } from './Car';

export class Van extends Car {
    color = '#336699';
    carSpeed = 120;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 18 * 4;
        this.height = 8 * 4;
    }
}
