export const DEFAULT_MIXER = {
  clara: { volume: 0.8, muted: false },
  sorda: { volume: 0.7, muted: false },
  cajon: { volume: 0.45, muted: false },
};

export function normalizeMixer(value) {
  return Object.fromEntries(Object.entries(DEFAULT_MIXER).map(([voice, fallback]) => {
    const entry = value?.[voice];
    return [voice, {
      volume: Number.isFinite(entry?.volume) ? Math.min(1, Math.max(0, entry.volume)) : fallback.volume,
      muted: typeof entry?.muted === "boolean" ? entry.muted : fallback.muted,
    }];
  }));
}

export const VELOCITY = { accent: 1, soft: 0.58, ghost: 0.28, rest: 0 };

// All sounds are synthesized. This buffer is generated noise, never a sample file.
export class CompasSynth {
  constructor(context, mixer = DEFAULT_MIXER) {
    this.context = context;
    this.sources = new Set();
    this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.3), context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.master = context.createGain();
    this.master.gain.value = 0.8;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -4;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.08;
    this.master.connect(this.limiter);
    this.limiter.connect(context.destination);
    this.voices = Object.fromEntries(Object.keys(DEFAULT_MIXER).map((voice) => {
      const gain = context.createGain();
      gain.gain.value = mixer[voice].muted ? 0 : mixer[voice].volume;
      gain.connect(this.master);
      return [voice, gain];
    }));
  }

  setMixer(mixer) {
    for (const [voice, gain] of Object.entries(this.voices)) {
      gain.gain.setTargetAtTime(mixer[voice].muted ? 0 : mixer[voice].volume, this.context.currentTime, 0.008);
    }
  }

  track(source, nodes, time, duration, offset) {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
    };
    if (offset === undefined) source.start(time);
    else source.start(time, offset);
    source.stop(time + duration);
  }

  noiseBurst(time, duration, voice, velocity, filterType, frequency, amplitude, clap = false) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    const envelope = this.context.createGain();
    const peak = Math.max(0.0001, velocity * amplitude);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(peak, time + 0.001);
    if (clap) {
      // Several tiny impacts give the initial hand-clap its sharp, clustered attack.
      envelope.gain.exponentialRampToValueAtTime(peak * 0.25, time + 0.008);
      envelope.gain.exponentialRampToValueAtTime(peak * 0.65, time + 0.011);
      envelope.gain.exponentialRampToValueAtTime(peak * 0.2, time + 0.018);
      envelope.gain.exponentialRampToValueAtTime(peak * 0.4, time + 0.021);
    }
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.voices[voice]);
    this.track(source, [filter, envelope], time, duration, Math.random() * (0.3 - duration));
  }

  tone(time, duration, from, to, velocity, amplitude) {
    const source = this.context.createOscillator();
    source.type = "sine";
    source.frequency.setValueAtTime(from, time);
    source.frequency.exponentialRampToValueAtTime(to, time + Math.min(duration, 0.12));
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, velocity * amplitude), time + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(envelope);
    envelope.connect(this.voices.cajon);
    this.track(source, [envelope], time, duration);
  }

  clara(time, velocity = 1) {
    this.noiseBurst(time, 0.065, "clara", velocity, "bandpass", 2600, 1.3, true);
  }

  sorda(time, velocity = 1) {
    this.noiseBurst(time, 0.07, "sorda", velocity, "lowpass", 800, 0.9);
  }

  bass(time, velocity = 1) {
    this.tone(time, 0.12, 150, 50, velocity, 0.85);
    this.noiseBurst(time, 0.009, "cajon", velocity, "highpass", 1200, 0.1);
  }

  slap(time, velocity = 1) {
    this.noiseBurst(time, 0.045, "cajon", velocity, "bandpass", 1800, 0.8);
    this.tone(time, 0.055, 320, 260, velocity, 0.12);
  }

  playHit(time, hit, layerVolume = 1, offbeat = false) {
    const velocity = (VELOCITY[hit] || 0) * layerVolume;
    if (velocity <= 0) return;
    if (hit === "accent") this.clara(time, velocity);
    else this.sorda(time, velocity);
    if (!offbeat) {
      if (hit === "accent") this.bass(time, velocity);
      else this.slap(time, velocity);
    }
  }

  stop() {
    for (const source of this.sources) {
      try { source.stop(this.context.currentTime); } catch (_) { /* already ended */ }
    }
    this.sources.clear();
  }

  dispose() {
    this.stop();
    Object.values(this.voices).forEach((gain) => gain.disconnect());
    this.master.disconnect();
    this.limiter.disconnect();
  }
}
