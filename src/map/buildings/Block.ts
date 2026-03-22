import { Building } from '../Building';

export class Block extends Building {
    color: string;
    label: string;

    constructor(x: number, y: number, w: number, h: number, color = '#887766', label = 'BLOCK') {
        super(x, y, w, h);
        this.color = color;
        this.label = label;
    }
}
