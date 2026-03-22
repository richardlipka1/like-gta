import { Car } from './Car';

export class Ambulance extends Car {
    color = '#eeeeee';
    carSpeed = 110;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 16 * 4;
        this.height = 8 * 4;
    }
}
