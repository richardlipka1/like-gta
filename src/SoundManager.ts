export class SoundManager {
    private audioCtx: AudioContext | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private walkTimer: number = 0;

    private static readonly WALK_INTERVAL = 0.28;
    private static readonly SHOOT_FREQ_START = 880;
    private static readonly SHOOT_FREQ_END = 110;
    private static readonly SHOOT_DURATION = 0.18;
    private static readonly SHOOT_GAIN = 0.25;
    private static readonly HORN_FREQ = 466;
    private static readonly HORN_GAIN = 0.2;
    private static readonly HORN_DURATION = 0.45;
    private static readonly WALK_FREQ = 130;
    private static readonly WALK_GAIN = 0.07;
    private static readonly WALK_DURATION = 0.07;
    private static readonly ENGINE_FREQ_IDLE = 55;
    private static readonly ENGINE_FREQ_MOVING = 110;
    private static readonly ENGINE_GAIN_IDLE = 0.05;
    private static readonly ENGINE_GAIN_MOVING = 0.09;
    private static readonly ENGINE_GAIN_START = 0.06;
    private static readonly ENGINE_RAMP_TIME = 0.15;

    private getCtx(): AudioContext {
        if (!this.audioCtx) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
            this.audioCtx = new AudioCtx();
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
        osc.frequency.setValueAtTime(SoundManager.SHOOT_FREQ_START, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(SoundManager.SHOOT_FREQ_END, ctx.currentTime + SoundManager.SHOOT_DURATION);
        gain.gain.setValueAtTime(SoundManager.SHOOT_GAIN, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + SoundManager.SHOOT_DURATION);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + SoundManager.SHOOT_DURATION);
    }

    playHorn(): void {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(SoundManager.HORN_FREQ, ctx.currentTime);
        gain.gain.setValueAtTime(SoundManager.HORN_GAIN, ctx.currentTime);
        gain.gain.setValueAtTime(SoundManager.HORN_GAIN, ctx.currentTime + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + SoundManager.HORN_DURATION);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + SoundManager.HORN_DURATION);
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
        osc.frequency.setValueAtTime(SoundManager.WALK_FREQ, ctx.currentTime);
        gain.gain.setValueAtTime(SoundManager.WALK_GAIN, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + SoundManager.WALK_DURATION);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + SoundManager.WALK_DURATION);
    }

    startEngine(): void {
        if (this.engineOsc) return;
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(SoundManager.ENGINE_FREQ_IDLE, ctx.currentTime);
        gain.gain.setValueAtTime(SoundManager.ENGINE_GAIN_START, ctx.currentTime);
        osc.start(ctx.currentTime);
        this.engineOsc = osc;
        this.engineGain = gain;
    }

    updateEngine(isMoving: boolean): void {
        if (!this.engineOsc || !this.engineGain) return;
        const ctx = this.getCtx();
        const targetFreq = isMoving ? SoundManager.ENGINE_FREQ_MOVING : SoundManager.ENGINE_FREQ_IDLE;
        const targetGain = isMoving ? SoundManager.ENGINE_GAIN_MOVING : SoundManager.ENGINE_GAIN_IDLE;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, SoundManager.ENGINE_RAMP_TIME);
        this.engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, SoundManager.ENGINE_RAMP_TIME);
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
