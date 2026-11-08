export const DEFAULT_MIXER = {
  clara: { volume: 0.8, muted: false },
  sorda: { volume: 0.6, muted: false },
  cajon: { volume: 0.9, muted: false },
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

export const VELOCITY = { accent: 1, soft: 0.8, ghost: 0.55, rest: 0 };

// Zero-based indices, used only where the preset lacks information.
const TWELVE = { accent: [2, 5, 7, 9, 11], weak: [1, 4, 6, 8, 10] };
const FALLBACKS = {
  solea: { beats: 12, ...TWELVE },
  alegrias: { beats: 12, ...TWELVE },
  bulerias: { beats: 12, accent: [11, 2, 5, 7, 9], weak: [1, 4, 6, 8, 10] },
  tangos: { beats: 4, accent: [0, 2], weak: [1, 3] },
};

export function resolveBeatHit(palo, index, offbeat = false) {
  const fallback = FALLBACKS[palo.id]?.beats === palo.beats ? FALLBACKS[palo.id] : null;
  const storedHit = (offbeat ? palo.offbeatPattern : palo.pattern)?.[index];
  const hit = Object.hasOwn(VELOCITY, storedHit) ? storedHit
    : offbeat ? "rest" : fallback?.accent.includes(index) ? "accent" : "soft";
  const weak = hit === "ghost" || offbeat || fallback?.weak.includes(index);
  const velocity = hit === "rest" ? 0 : hit === "accent" ? 1 : weak ? 0.55 : 0.8;
  return { hit, velocity };
}

// Reuse exactly one generated 0.5-second buffer for each AudioContext.
const NOISE_BUFFERS = new WeakMap();

export class CompasSynth {
  constructor(context, mixer = DEFAULT_MIXER) {
    this.context = context;
    this.mixer = normalizeMixer(mixer);
    this.sources = new Set();
    if (!NOISE_BUFFERS.has(context)) {
      const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      NOISE_BUFFERS.set(context, buffer);
    }
    this.noise = NOISE_BUFFERS.get(context);

    // Existing layer volumes and mutes are output controls, separate from the
    // exact per-note envelopes. No fixed master attenuation or compressor.
    this.layerVolumes = { main: 1, offbeat: 1 };
    this.voices = Object.fromEntries(Object.keys(DEFAULT_MIXER).map((voice) => [voice,
      Object.fromEntries(["main", "offbeat"].map((layer) => {
        const gain = context.createGain();
        gain.gain.value = this.mixer[voice].muted ? 0 : 1;
        gain.connect(context.destination);
        return [layer, gain];
      })),
    ]));
  }

  setMixer(mixer) {
    this.mixer = normalizeMixer(mixer);
    this.updateOutputs();
  }

  updateOutputs() {
    for (const [voice, outputs] of Object.entries(this.voices)) {
      for (const [layer, output] of Object.entries(outputs)) {
        output.gain.setValueAtTime(this.mixer[voice].muted ? 0 : this.layerVolumes[layer], this.context.currentTime);
      }
    }
  }

  track(source, nodes, time, stopTime) {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
    };
    source.start(time);
    source.stop(stopTime);
  }

  noiseHit(t, filterType, freq, Q, dur, gain, destination = this.context.destination) {
    if (gain <= 0) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(gain, t);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + dur);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    this.track(source, [filter, envelope], t, t + dur + 0.02);
  }

  clara(t, velocity = 1) {
    this.noiseHit(t, "bandpass", 2500, 1.2, 0.06, 0.9 * velocity * this.mixer.clara.volume, this.voices.clara.main);
  }

  sorda(t, velocity = 0.8, offbeat = false) {
    this.noiseHit(t, "lowpass", 800, 1, 0.09, 0.5 * velocity * this.mixer.sorda.volume, this.voices.sorda[offbeat ? "offbeat" : "main"]);
  }

  bass(t, velocity = 1, accent = true) {
    const gain = (accent ? 0.9 : 0.35) * velocity * this.mixer.cajon.volume;
    if (gain <= 0) return;
    const source = this.context.createOscillator();
    source.type = "sine";
    source.frequency.setValueAtTime(150, t);
    source.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(gain, t);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    source.connect(envelope);
    envelope.connect(this.voices.cajon.main);
    this.track(source, [envelope], t, t + 0.16);
    // Click Q is unspecified: use the BiquadFilter's standard Q of 1.
    this.noiseHit(t, "highpass", 1000, 1, 0.02, gain * 0.25, this.voices.cajon.main);
  }

  playHit(t, hit, layerVolume = 1, offbeat = false, beatIndex = 0, velocity = VELOCITY[hit] || 0) {
    if (hit === "rest" || velocity <= 0) return;
    this.layerVolumes[offbeat ? "offbeat" : "main"] = layerVolume;
    this.updateOutputs();
    if (offbeat) {
      this.sorda(t, 0.55, true);
    } else if (hit === "accent") {
      this.clara(t, 1);
      this.bass(t, 1, true);
    } else {
      this.sorda(t, velocity);
      if (beatIndex % 2 === 0) this.bass(t, velocity, false);
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
    Object.values(this.voices).forEach((outputs) => Object.values(outputs).forEach((gain) => gain.disconnect()));
  }
}
