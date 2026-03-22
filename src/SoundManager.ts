export class SoundManager {
    private audioCtx: AudioContext | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private walkTimer: number = 0;
    private static readonly WALK_INTERVAL = 0.28;

    private getCtx(): AudioContext {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        return this.audioCtx;
    }

    playShoot(): void {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
    }

    playHorn(): void {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(466, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
    }

    updateWalk(isWalking: boolean, dt: number): void {
        if (!isWalking) {
            this.walkTimer = 0;
            return;
        }
        this.walkTimer -= dt;
        if (this.walkTimer <= 0) {
            this.walkTimer = SoundManager.WALK_INTERVAL;
            this.playFootstep();
        }
    }

    private playFootstep(): void {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.07);
    }

    startEngine(): void {
        if (this.engineOsc) return;
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        osc.start(ctx.currentTime);
        this.engineOsc = osc;
        this.engineGain = gain;
    }

    updateEngine(isMoving: boolean): void {
        if (!this.engineOsc || !this.engineGain) return;
        const ctx = this.getCtx();
        const targetFreq = isMoving ? 110 : 55;
        const targetGain = isMoving ? 0.09 : 0.05;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.15);
        this.engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.15);
    }

    stopEngine(): void {
        if (!this.engineOsc || !this.engineGain) return;
        const ctx = this.getCtx();
        this.engineGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.1);
        this.engineOsc.stop(ctx.currentTime + 0.4);
        this.engineOsc = null;
        this.engineGain = null;
    }
}
