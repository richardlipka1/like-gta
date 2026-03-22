export class InputHandler {
    private keys: Set<string> = new Set();
    private justPressedKeys: Set<string> = new Set();

    constructor() {
        window.addEventListener('keydown', e => {
            if (!this.keys.has(e.key)) {
                this.justPressedKeys.add(e.key);
            }
            this.keys.add(e.key);
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys.delete(e.key);
        });
    }

    isDown(key: string): boolean {
        return this.keys.has(key);
    }

    justPressed(key: string): boolean {
        return this.justPressedKeys.has(key);
    }

    clearJustPressed(): void {
        this.justPressedKeys.clear();
    }
}
