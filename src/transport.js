export const LOOKAHEAD_SECONDS = 0.12;
export const TIMER_INTERVAL_MS = 25;

export function beatDuration(palo, tempo, swing, beat) {
  const base = 60 / tempo;
  // Preserve the existing alternating swing, normalized for odd-length compases.
  const mean = palo.beats % 2 === 0 ? 0 : 1 / palo.beats;
  return base * (1 + ((beat % 2 === 0 ? 1 : -1) - mean) * (swing / 100) * 0.18);
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
          if (audible) {
            this.synth.playHit(this.nextTime, palo.pattern[this.beat] || "rest", volume);
            this.onBeat({ time: this.nextTime, duration: this.duration, beat: this.beat, beats: palo.beats, offbeat: palo.offbeatEnabled });
          }
          this.half = 1;
        } else {
          if (audible && palo.offbeatEnabled) {
            this.synth.playHit(this.nextTime, palo.offbeatPattern[this.beat] || "rest", offbeatVolume, true);
          }
          this.beat = (this.beat + 1) % palo.beats;
          this.half = 0;
        }
        this.nextTime += this.duration / 2;
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
