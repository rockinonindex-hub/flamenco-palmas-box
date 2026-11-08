import { resolveBeatHit } from "./audio.js";

export const LOOKAHEAD_SECONDS = 0.12;
export const TIMER_INTERVAL_MS = 25;

export function beatDuration(_palo, tempo) {
  return 60 / tempo;
}

// The interval only fills the Web Audio queue. Neither React nor rAF owns time.
export class LookaheadTransport {
  constructor(context, synth, getSettings, onBeat, onError = () => {}) {
    this.context = context;
    this.synth = synth;
    this.getSettings = getSettings;
    this.onBeat = onBeat;
    this.onError = onError;
    this.timer = null;
    this.running = false;
    this.beat = 0;
    this.half = 0;
    this.nextTime = 0;
    this.duration = 0;
    this.offbeatPhase = 0.5;
  }

  start() {
    this.stop();
    this.running = true;
    this.beat = 0;
    this.half = 0;
    this.nextTime = this.context.currentTime + 0.05;
    this.pump();
    if (this.running) this.timer = setInterval(() => this.pump(), TIMER_INTERVAL_MS);
  }

  pump() {
    if (!this.running || this.context.state !== "running") return;
    try {
      const now = this.context.currentTime;
      const settings = this.getSettings();
      if (!settings.palo) return;
      // After a background stall skip missed subdivisions; never burst-play them.
      // Keep the original clock grid, rather than rebasing onto interval arrival.
      while (this.nextTime < now + LOOKAHEAD_SECONDS) {
        const { palo, tempo, swing, volume, offbeatVolume } = settings;
        const audible = this.nextTime >= now;
        if (this.half === 0) {
          this.duration = beatDuration(palo, tempo, swing, this.beat);
          // Keep the existing Swing control, moving only the offbeat so the
          // main clock always has the specified 60 / BPM spacing.
          this.offbeatPhase = 0.5 + (swing / 100) * 0.18;
          if (audible) {
            const { hit, velocity } = resolveBeatHit(palo, this.beat);
            this.synth.playHit(this.nextTime, hit, volume, false, this.beat, velocity);
            this.onBeat({ time: this.nextTime, duration: this.duration, beat: this.beat, beats: palo.beats, offbeat: palo.offbeatEnabled, offbeatPhase: this.offbeatPhase });
          }
          this.half = 1;
          this.nextTime += this.duration * this.offbeatPhase;
        } else {
          if (audible && palo.offbeatEnabled) {
            const { hit, velocity } = resolveBeatHit(palo, this.beat, true);
            this.synth.playHit(this.nextTime, hit, offbeatVolume, true, this.beat, velocity);
          }
          this.beat = (this.beat + 1) % palo.beats;
          this.half = 0;
          this.nextTime += this.duration * (1 - this.offbeatPhase);
        }
      }
    } catch (error) {
      this.stop();
      this.onError(error);
    }
  }

  stop() {
    this.running = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.synth.stop();
  }
}
