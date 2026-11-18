import { GameConfig } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private masterVol = 0.8;
  private musicVol = 0.65;
  private sfxVol = 0.85;
  private muted = false;

  // Chiptune Sequencer state
  private stepIdx = 0;
  private nextNoteTime = 0;
  private readonly bassLine = [33, 29, 36, 31];
  private readonly melody = [
    [69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 76, 81, 0, 76, 0],
    [65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 69, 72, 77, 0, 72, 0],
    [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 76, 79, 84, 0, 79, 0],
    [67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 71, 74, 79, 0, 74, 0],
  ];

  init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.applyVolumes();
      } catch {
        // AudioContext blocked or unavailable
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  applyConfig(cfg: GameConfig['audio']) {
    this.masterVol = cfg.masterVolume;
    this.musicVol = cfg.musicVolume;
    this.sfxVol = cfg.sfxVolume;
    this.muted = cfg.muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVol, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVol, now, 0.02);
  }

  private ensureNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuf) {
      const len = Math.floor(this.ctx.sampleRate * 0.45);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuf;
  }

  tone(freq: number, dur: number, type: OscillatorType = 'square', slide = 0, vol = 0.09) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  noise(dur: number, vol = 0.12, filterFreq = 1800) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const buf = this.ensureNoiseBuffer();
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + dur);
  }

  uiClick() {
    this.tone(660, 0.045, 'triangle', 180, 0.06);
  }

  uiConfirm() {
    this.tone(520, 0.08, 'square', 260, 0.07);
    setTimeout(() => this.tone(780, 0.1, 'square', 120, 0.06), 60);
  }

  jump() {
    this.tone(280, 0.11, 'square', 420, 0.07);
  }

  dash() {
    this.tone(480, 0.08, 'triangle', 320, 0.08);
    this.noise(0.06, 0.06, 3200);
  }

  hit() {
    this.noise(0.07, 0.14, 2400);
    this.tone(220, 0.08, 'square', -130, 0.09);
  }

  heavy() {
    this.noise(0.24, 0.24, 900);
    this.tone(115, 0.26, 'sawtooth', -75, 0.14);
  }

  gunshot() {
    this.noise(0.08, 0.2, 4200);
    this.tone(320, 0.06, 'sawtooth', -260, 0.12);
  }

  rocket() {
    this.noise(0.22, 0.15, 1100);
    this.tone(180, 0.22, 'sawtooth', 260, 0.08);
  }

  explosion() {
    this.noise(0.42, 0.3, 650);
    this.tone(95, 0.38, 'sawtooth', -65, 0.16);
  }

  reloadStart() {
    this.tone(420, 0.045, 'triangle', -160, 0.055);
    this.noise(0.035, 0.04, 3400);
  }

  reloadClick() {
    this.tone(680, 0.05, 'square', 220, 0.06);
    setTimeout(() => this.tone(980, 0.06, 'triangle', 120, 0.055), 55);
  }

  footstep() {
    this.noise(0.025, 0.03, 750);
  }

  land() {
    this.noise(0.065, 0.075, 580);
    this.tone(110, 0.06, 'triangle', -45, 0.05);
  }

  saw() {
    this.tone(95, 0.07, 'sawtooth', 45, 0.07);
    this.noise(0.05, 0.06, 2800);
  }

  sword() {
    this.tone(920, 0.12, 'sawtooth', -650, 0.06);
    this.noise(0.06, 0.05, 5000);
  }

  ko() {
    this.noise(0.65, 0.28, 800);
    this.tone(220, 0.65, 'sawtooth', -180, 0.14);
  }

  siren() {
    [0, 260].forEach((d) => setTimeout(() => this.tone(520, 0.28, 'sawtooth', 420, 0.1), d));
    this.tone(90, 0.55, 'square', 0, 0.06);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.24, 'square', 0, 0.08), i * 130)
    );
  }

  resetMusic() {
    this.stepIdx = 0;
    this.nextNoteTime = 0;
  }

  private midiFreq(n: number): number {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  private scheduleNote(f: number, d: number, ty: OscillatorType, t: number, v: number) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = ty;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + d);
  }

  private scheduleKick(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.15);
  }

  private scheduleHat(t: number, d: number, v: number) {
    if (!this.ctx || !this.musicGain) return;
    const buf = this.ensureNoiseBuffer();
    if (!buf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(g);
    g.connect(this.musicGain);
    s.start(t);
    s.stop(t + d);
  }

  tickMusic(dangerMode: boolean) {
    if (!this.ctx || !this.musicGain || this.muted || this.musicVol <= 0.01) return;
    if (this.ctx.state !== 'running') return;
    const stepDur = 60 / (dangerMode ? 164 : 132) / 4;
    const transpose = dangerMode ? 1 : 0;
    if (this.nextNoteTime < this.ctx.currentTime - 0.1) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    }
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const s = this.stepIdx % 64;
      const bar = s >> 4;
      const st = s & 15;
      const t = this.nextNoteTime;
      const n = this.melody[bar][st];
      if (st % 2 === 0) {
        this.scheduleNote(this.midiFreq(this.bassLine[bar] + transpose + (st % 4 === 2 ? 12 : 0)), stepDur * 1.8, 'sawtooth', t, 0.055);
      }
      if (n) {
        this.scheduleNote(this.midiFreq(n + transpose), stepDur * 1.6, 'square', t, 0.04);
      }
      if (st === 0 || st === 8 || st === 10) this.scheduleKick(t);
      if (st === 4 || st === 12) this.scheduleHat(t, 0.11, 0.075);
      if (st % 2 === 0) this.scheduleHat(t, 0.03, 0.025);
      this.nextNoteTime += stepDur;
      this.stepIdx++;
    }
  }
}

export const sound = new SoundEngine();
