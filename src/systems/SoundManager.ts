import Phaser from 'phaser';

/**
 * SoundManager -- Procedural audio engine for the Earth Defense game.
 *
 * Uses the Web Audio API to generate retro/sci-fi sound effects entirely in
 * code. No external audio files are needed. All sounds are synthesized using
 * oscillators, noise bursts, and gain envelopes, then cached as AudioBuffer
 * objects keyed by name.
 *
 * Usage:
 *   const sm = new SoundManager(scene);
 *   sm.play('shoot-laser');
 *   sm.setVolume(0.5);
 *   sm.toggleMute();
 *
 * The SoundManager handles AudioContext unlock (browsers require a user
 * gesture before audio can play). It registers a one-time pointerdown
 * listener that resumes the context on first interaction.
 */
export class SoundManager {
  private audioCtx: AudioContext;
  private masterGain: GainNode;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private _isMuted: boolean = false;
  private _volume: number = 0.5;
  private scene: Phaser.Scene;
  private unlocked: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.audioCtx = new AudioContext();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this._volume;
    this.masterGain.connect(this.audioCtx.destination);

    // Handle AudioContext unlock on user interaction
    this.setupUnlock();

    // Generate all sound effects up-front
    this.generateAllSounds();
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Play a cached sound by key. If the AudioContext is suspended (no user
   * interaction yet), the call is silently ignored.
   */
  play(key: string): void {
    if (this._isMuted) return;

    const buffer = this.bufferCache.get(key);
    if (!buffer) {
      console.warn(`SoundManager: unknown sound key "${key}"`);
      return;
    }

    // Attempt to resume in case it is still suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start();
  }

  /**
   * Set the master volume (0 to 1).
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = this._volume;
  }

  /**
   * Get the current master volume.
   */
  getVolume(): number {
    return this._volume;
  }

  /**
   * Toggle mute state. Returns the new muted value.
   */
  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    this.masterGain.gain.value = this._isMuted ? 0 : this._volume;
    return this._isMuted;
  }

  /**
   * Whether audio is currently muted.
   */
  get isMuted(): boolean {
    return this._isMuted;
  }

  // -------------------------------------------------------------------
  // AudioContext unlock
  // -------------------------------------------------------------------

  private setupUnlock(): void {
    if (this.audioCtx.state !== 'suspended') {
      this.unlocked = true;
      return;
    }

    const unlock = (): void => {
      if (this.unlocked) return;
      this.audioCtx.resume().then(() => {
        this.unlocked = true;
      });
      // Remove after first trigger
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('pointerdown', unlock, { once: false });
    document.addEventListener('keydown', unlock, { once: false });
  }

  // -------------------------------------------------------------------
  // Sound generation -- top-level dispatcher
  // -------------------------------------------------------------------

  private generateAllSounds(): void {
    // Tower sounds
    this.bufferCache.set('shoot-laser', this.genShootLaser());
    this.bufferCache.set('shoot-missile', this.genShootMissile());
    this.bufferCache.set('shoot-cryo', this.genShootCryo());
    this.bufferCache.set('shoot-railgun', this.genShootRailgun());
    this.bufferCache.set('shoot-pulse', this.genShootPulse());

    // Enemy sounds
    this.bufferCache.set('enemy-death', this.genEnemyDeath());
    this.bufferCache.set('enemy-reached-base', this.genEnemyReachedBase());

    // UI sounds
    this.bufferCache.set('tower-place', this.genTowerPlace());
    this.bufferCache.set('tower-upgrade', this.genTowerUpgrade());
    this.bufferCache.set('tower-sell', this.genTowerSell());
    this.bufferCache.set('ui-click', this.genUIClick());
    this.bufferCache.set('level-complete', this.genLevelComplete());
    this.bufferCache.set('game-over', this.genGameOver());
  }

  // -------------------------------------------------------------------
  // Utility: create a buffer from sample-generating function
  // -------------------------------------------------------------------

  /**
   * Create an AudioBuffer of the given duration (seconds) at the
   * AudioContext sample rate. The `fillFn` receives the sample array
   * and sample rate and is responsible for writing sample values (-1..1).
   */
  private createBuffer(duration: number, fillFn: (data: Float32Array, sampleRate: number) => void): AudioBuffer {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    fillFn(data, sampleRate);
    return buffer;
  }

  // -------------------------------------------------------------------
  // Envelope helpers
  // -------------------------------------------------------------------

  /**
   * Linear attack-decay envelope. Returns a gain value (0..1) for a given
   * time t within a total duration. Attack is the ramp-up time, the rest
   * is decay to 0.
   */
  private adEnvelope(t: number, duration: number, attack: number): number {
    if (t < attack) {
      return t / attack;
    }
    const decay = duration - attack;
    if (decay <= 0) return 0;
    return Math.max(0, 1 - (t - attack) / decay);
  }

  // -------------------------------------------------------------------
  // Tower sounds
  // -------------------------------------------------------------------

  /**
   * shoot-laser: Short high-pitched "pew" -- quick sine sweep down from
   * ~1200Hz to 400Hz over 80ms.
   */
  private genShootLaser(): AudioBuffer {
    const duration = 0.08;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.003);
        const freq = 1200 - (800 * t / duration);
        phase += (2 * Math.PI * freq) / sr;
        data[i] = Math.sin(phase) * env * 0.6;
      }
    });
  }

  /**
   * shoot-missile: Deep "thwoomp" -- low sine sweep up from 80Hz to 200Hz
   * with a noise burst layered in. 200ms duration.
   */
  private genShootMissile(): AudioBuffer {
    const duration = 0.2;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.01);
        const freq = 80 + (120 * t / duration);
        phase += (2 * Math.PI * freq) / sr;
        const sine = Math.sin(phase) * 0.7;
        // Noise burst, strongest at the start
        const noiseEnv = this.adEnvelope(t, duration * 0.4, 0.005);
        const noise = (Math.random() * 2 - 1) * 0.3 * noiseEnv;
        data[i] = (sine + noise) * env;
      }
    });
  }

  /**
   * shoot-cryo: Crystalline "shhhh" -- filtered white noise with a
   * resonant quality. 150ms duration. We simulate a band-pass by mixing
   * noise with a sine at a high frequency.
   */
  private genShootCryo(): AudioBuffer {
    const duration = 0.15;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.01);
        // High-frequency sine for resonance
        const freq = 4000 + Math.sin(t * 80) * 500;
        phase += (2 * Math.PI * freq) / sr;
        const resonance = Math.sin(phase) * 0.3;
        const noise = (Math.random() * 2 - 1) * 0.5;
        data[i] = (noise * 0.5 + resonance) * env;
      }
    });
  }

  /**
   * shoot-railgun: Sharp "crack" -- very short noise burst (first 20ms)
   * followed by a sine ring at 600Hz. 100ms total.
   */
  private genShootRailgun(): AudioBuffer {
    const duration = 0.1;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const totalEnv = this.adEnvelope(t, duration, 0.001);
        // Noise burst in first 20ms
        const noisePart = t < 0.02 ? (Math.random() * 2 - 1) * (1 - t / 0.02) : 0;
        // Sine ring at 600Hz with decay
        phase += (2 * Math.PI * 600) / sr;
        const ringEnv = t >= 0.01 ? this.adEnvelope(t - 0.01, duration - 0.01, 0.001) : 0;
        const ring = Math.sin(phase) * ringEnv * 0.5;
        data[i] = (noisePart * 0.8 + ring) * totalEnv;
      }
    });
  }

  /**
   * shoot-pulse: Expanding "woom" -- sine sweep down from 400Hz to 100Hz
   * with a long release. 300ms duration.
   */
  private genShootPulse(): AudioBuffer {
    const duration = 0.3;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.01);
        const freq = 400 - (300 * t / duration);
        phase += (2 * Math.PI * freq) / sr;
        data[i] = Math.sin(phase) * env * 0.6;
      }
    });
  }

  // -------------------------------------------------------------------
  // Enemy sounds
  // -------------------------------------------------------------------

  /**
   * enemy-death: Quick "pop/splat" -- noise burst with pitch envelope
   * sweeping down. 100ms.
   */
  private genEnemyDeath(): AudioBuffer {
    const duration = 0.1;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.002);
        const freq = 800 - (600 * t / duration);
        phase += (2 * Math.PI * freq) / sr;
        const tone = Math.sin(phase) * 0.4;
        const noise = (Math.random() * 2 - 1) * 0.4 * this.adEnvelope(t, duration * 0.5, 0.002);
        data[i] = (tone + noise) * env;
      }
    });
  }

  /**
   * enemy-reached-base: Warning "buzz" -- square wave at 200Hz with
   * tremolo (amplitude modulation at ~15Hz). 300ms.
   */
  private genEnemyReachedBase(): AudioBuffer {
    const duration = 0.3;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.005);
        phase += (2 * Math.PI * 200) / sr;
        // Square wave approximation
        const square = Math.sin(phase) > 0 ? 1 : -1;
        // Tremolo: amplitude modulation at ~15Hz
        const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 15 * t);
        data[i] = square * 0.4 * tremolo * env;
      }
    });
  }

  // -------------------------------------------------------------------
  // UI sounds
  // -------------------------------------------------------------------

  /**
   * tower-place: Satisfying "clunk" -- low sine thud at 150Hz. 100ms.
   */
  private genTowerPlace(): AudioBuffer {
    const duration = 0.1;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.003);
        phase += (2 * Math.PI * 150) / sr;
        data[i] = Math.sin(phase) * env * 0.7;
      }
    });
  }

  /**
   * tower-upgrade: Rising "ding-ding" -- two quick sine tones ascending
   * (400Hz then 600Hz). 200ms total.
   */
  private genTowerUpgrade(): AudioBuffer {
    const duration = 0.2;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const half = duration / 2;
        let freq: number;
        let env: number;
        if (t < half) {
          freq = 400;
          env = this.adEnvelope(t, half, 0.003);
        } else {
          freq = 600;
          env = this.adEnvelope(t - half, half, 0.003);
        }
        phase += (2 * Math.PI * freq) / sr;
        data[i] = Math.sin(phase) * env * 0.5;
      }
    });
  }

  /**
   * tower-sell: Descending "cha-ching" -- two tones descending (600Hz
   * then 400Hz) with a subtle noise layer. 200ms total.
   */
  private genTowerSell(): AudioBuffer {
    const duration = 0.2;
    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const half = duration / 2;
        let freq: number;
        let env: number;
        if (t < half) {
          freq = 600;
          env = this.adEnvelope(t, half, 0.003);
        } else {
          freq = 400;
          env = this.adEnvelope(t - half, half, 0.003);
        }
        phase += (2 * Math.PI * freq) / sr;
        const tone = Math.sin(phase) * 0.5;
        const noise = (Math.random() * 2 - 1) * 0.1 * env;
        data[i] = (tone + noise) * env;
      }
    });
  }

  /**
   * ui-click: Simple click -- very short noise burst. 30ms.
   */
  private genUIClick(): AudioBuffer {
    const duration = 0.03;
    return this.createBuffer(duration, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const env = this.adEnvelope(t, duration, 0.001);
        data[i] = (Math.random() * 2 - 1) * env * 0.3;
      }
    });
  }

  /**
   * level-complete: Victory jingle -- ascending arpeggio of 4 tones
   * (C5-E5-G5-C6 = 523, 659, 784, 1047 Hz). ~500ms total.
   */
  private genLevelComplete(): AudioBuffer {
    const duration = 0.5;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDuration = duration / notes.length;

    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noteIndex = Math.min(Math.floor(t / noteDuration), notes.length - 1);
        const noteT = t - noteIndex * noteDuration;
        const freq = notes[noteIndex];
        const env = this.adEnvelope(noteT, noteDuration, 0.005);
        phase += (2 * Math.PI * freq) / sr;
        data[i] = Math.sin(phase) * env * 0.4;
      }
    });
  }

  /**
   * game-over: Sad descending tones -- 3 tones going down (G4-E4-C4 =
   * 392, 330, 262 Hz). ~600ms total.
   */
  private genGameOver(): AudioBuffer {
    const duration = 0.6;
    const notes = [392.0, 329.63, 261.63]; // G4, E4, C4
    const noteDuration = duration / notes.length;

    return this.createBuffer(duration, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noteIndex = Math.min(Math.floor(t / noteDuration), notes.length - 1);
        const noteT = t - noteIndex * noteDuration;
        const freq = notes[noteIndex];
        const env = this.adEnvelope(noteT, noteDuration, 0.005);
        phase += (2 * Math.PI * freq) / sr;
        data[i] = Math.sin(phase) * env * 0.4;
      }
    });
  }
}
