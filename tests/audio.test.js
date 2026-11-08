import test from "node:test";
import assert from "node:assert/strict";
import { CompasSynth, DEFAULT_MIXER, normalizeMixer, resolveBeatHit } from "../src/audio.js";

class Param {
  value = 1;
  events = [];
  setValueAtTime(value, time) { this.events.push(["set", value, time]); }
  exponentialRampToValueAtTime(value, time) { this.events.push(["exponential", value, time]); }
}

function audioContext() {
  const context = { currentTime: 0, sampleRate: 48000, destination: {}, buffers: [], sources: [], filters: [], gains: [] };
  const node = (extra = {}) => ({ outputs: [], connect(target) { this.outputs.push(target); }, disconnect() { this.disconnected = true; }, ...extra });
  const source = (kind, extra = {}) => {
    const result = node({ kind, start(...args) { this.started = args; }, stop(time) { this.stopped = time; }, ...extra });
    context.sources.push(result);
    return result;
  };
  context.createBuffer = (channels, length, sampleRate) => {
    const data = new Float32Array(length);
    const buffer = { channels, length, sampleRate, getChannelData: () => data };
    context.buffers.push(buffer);
    return buffer;
  };
  context.createBufferSource = () => source("noise");
  context.createOscillator = () => source("oscillator", { frequency: new Param() });
  context.createBiquadFilter = () => {
    const filter = node({ frequency: new Param(), Q: new Param() });
    context.filters.push(filter);
    return filter;
  };
  context.createGain = () => {
    const gain = node({ gain: new Param() });
    context.gains.push(gain);
    return gain;
  };
  return context;
}

function envelope(source) { return source.kind === "noise" ? source.outputs[0].outputs[0] : source.outputs[0]; }
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

test("one 0.5-second uniform white-noise buffer is shared by every voice and synth on the same context", () => {
  const ctx = audioContext();
  const synth = new CompasSynth(ctx);
  const otherSynth = new CompasSynth(ctx);
  assert.equal(ctx.buffers.length, 1);
  assert.equal(synth.noise.length, 24000);
  assert.equal(synth.noise.sampleRate, 48000);
  assert.equal(otherSynth.noise, synth.noise);
  const data = synth.noise.getChannelData(0);
  assert.ok(data.every((value) => value >= -1 && value <= 1));
  assert.ok(data.some((value) => value < -0.9) && data.some((value) => value > 0.9));
  synth.clara(1); synth.sorda(2); synth.bass(3);
  assert.ok(ctx.sources.filter((source) => source.kind === "noise").every((source) => source.buffer === synth.noise));
  assert.equal(ctx.buffers.length, 1);
});

test("noiseHit follows the exact graph, envelope, start time and 20ms release tail", () => {
  const ctx = audioContext();
  const synth = new CompasSynth(ctx);
  synth.noiseHit(1, "bandpass", 2500, 1.2, 0.06, 0.72);
  const source = ctx.sources[0];
  const filter = source.outputs[0];
  const gain = envelope(source);
  assert.equal(filter.type, "bandpass");
  assert.equal(filter.frequency.value, 2500);
  assert.equal(filter.Q.value, 1.2);
  assert.deepEqual(gain.gain.events, [["set", 0.72, 1], ["exponential", 0.001, 1.06]]);
  assert.equal(gain.outputs[0], ctx.destination);
  assert.deepEqual(source.started, [1]);
  near(source.stopped, 1.08);
});

test("accent produces exactly clara, sine cajon and its simultaneous highpass click", () => {
  const ctx = audioContext();
  const synth = new CompasSynth(ctx);
  synth.playHit(2, "accent", 1, false, 3, 1);
  assert.equal(ctx.sources.length, 3);
  const [clara, bass, click] = ctx.sources;
  const claraFilter = clara.outputs[0];
  assert.deepEqual([claraFilter.type, claraFilter.frequency.value, claraFilter.Q.value], ["bandpass", 2500, 1.2]);
  near(envelope(clara).gain.events[0][1], 0.9 * 1 * 0.8);
  assert.deepEqual(envelope(clara).gain.events[1], ["exponential", 0.001, 2.06]);
  near(clara.stopped, 2.08);
  assert.equal(bass.type, "sine");
  assert.deepEqual(bass.frequency.events, [["set", 150, 2], ["exponential", 50, 2.12]]);
  near(envelope(bass).gain.events[0][1], 0.9 * 1 * 0.9);
  assert.deepEqual(envelope(bass).gain.events[1], ["exponential", 0.001, 2.14]);
  near(bass.stopped, 2.16);
  const clickFilter = click.outputs[0];
  assert.deepEqual([clickFilter.type, clickFilter.frequency.value, clickFilter.Q.value], ["highpass", 1000, 1]);
  near(envelope(click).gain.events[0][1], 0.9 * 1 * 0.9 * 0.25);
  assert.deepEqual(envelope(click).gain.events[1], ["exponential", 0.001, 2.02]);
  near(click.stopped, 2.04);
  assert.ok(ctx.sources.every((source) => source.started[0] === 2));
});

test("non-accent odd beats play only sorda, even beats add the specified weak bass; no slap", () => {
  for (const [index, velocity, expectedSources] of [[1, 0.8, 1], [0, 0.8, 3], [2, 0.55, 3]]) {
    const ctx = audioContext();
    const synth = new CompasSynth(ctx);
    synth.playHit(1, "soft", 1, false, index, velocity);
    assert.equal(ctx.sources.length, expectedSources);
    const sorda = ctx.sources[0];
    const filter = sorda.outputs[0];
    assert.deepEqual([filter.type, filter.frequency.value, filter.Q.value], ["lowpass", 800, 1]);
    near(envelope(sorda).gain.events[0][1], 0.5 * velocity * 0.6);
    assert.deepEqual(envelope(sorda).gain.events[1], ["exponential", 0.001, 1.09]);
    near(sorda.stopped, 1.11);
    if (expectedSources === 3) {
      near(envelope(ctx.sources[1]).gain.events[0][1], 0.35 * velocity * 0.9);
      near(envelope(ctx.sources[2]).gain.events[0][1], 0.35 * velocity * 0.9 * 0.25);
    }
  }
});

test("offbeats always play sorda at velocity 0.55, and rests/zero voice volumes stay silent", () => {
  const ctx = audioContext();
  const synth = new CompasSynth(ctx);
  synth.playHit(1, "soft", 1, true, 2);
  assert.equal(ctx.sources.length, 1);
  near(envelope(ctx.sources[0]).gain.events[0][1], 0.5 * 0.55 * 0.6);
  synth.playHit(2, "rest");
  assert.equal(ctx.sources.length, 1);
  synth.setMixer({ clara: { volume: 0 }, sorda: { volume: 0 }, cajon: { volume: 0 } });
  synth.playHit(3, "accent");
  assert.equal(ctx.sources.length, 1);
});

test("existing accent/rest/ghost edits win; missing accent and weak information uses the exact zero-based lists", () => {
  for (const [id, beats, accents, weak] of [
    ["solea", 12, [2, 5, 7, 9, 11], [1, 4, 6, 8, 10]],
    ["alegrias", 12, [2, 5, 7, 9, 11], [1, 4, 6, 8, 10]],
    ["bulerias", 12, [11, 2, 5, 7, 9], [1, 4, 6, 8, 10]],
    ["tangos", 4, [0, 2], [1, 3]],
  ]) {
    const palo = { id, beats };
    for (let i = 0; i < beats; i++) {
      const beat = resolveBeatHit(palo, i);
      assert.equal(beat.hit, accents.includes(i) ? "accent" : "soft");
      assert.equal(beat.velocity, accents.includes(i) ? 1 : weak.includes(i) ? 0.55 : 0.8);
    }
  }
  const palo = { id: "bulerias", beats: 12, countFrom: 12, pattern: ["accent", "rest", "soft", "ghost"] };
  const before = JSON.stringify(palo);
  assert.deepEqual(resolveBeatHit(palo, 0), { hit: "accent", velocity: 1 });
  assert.deepEqual(resolveBeatHit(palo, 1), { hit: "rest", velocity: 0 });
  assert.deepEqual(resolveBeatHit(palo, 2), { hit: "soft", velocity: 0.8 });
  assert.deepEqual(resolveBeatHit(palo, 3), { hit: "ghost", velocity: 0.55 });
  assert.deepEqual(resolveBeatHit({ id: "bulerias", beats: 4 }, 2), { hit: "soft", velocity: 0.8 });
  assert.equal(JSON.stringify(palo), before);
});

test("default volumes are exact, saved user levels persist, and per-voice mute cancels both output layers", () => {
  assert.deepEqual(Object.values(DEFAULT_MIXER).map((entry) => entry.volume), [0.8, 0.6, 0.9]);
  assert.equal(normalizeMixer({ sorda: { volume: 0.37, muted: true } }).sorda.volume, 0.37);
  const ctx = audioContext();
  const synth = new CompasSynth(ctx);
  synth.playHit(1, "accent", 0.8);
  synth.playHit(1.25, "ghost", 0.55, true);
  synth.setMixer({ ...DEFAULT_MIXER, sorda: { volume: 0.6, muted: true } });
  assert.equal(synth.voices.sorda.main.gain.events.at(-1)[1], 0);
  assert.equal(synth.voices.sorda.offbeat.gain.events.at(-1)[1], 0);
  synth.setMixer(DEFAULT_MIXER);
  assert.equal(synth.voices.sorda.main.gain.events.at(-1)[1], 0.8);
  assert.equal(synth.voices.sorda.offbeat.gain.events.at(-1)[1], 0.55);
  synth.stop();
  assert.equal(synth.sources.size, 0);
  assert.ok(ctx.sources.every((source) => source.stopped === ctx.currentTime));
});
