import test from "node:test";
import assert from "node:assert/strict";
import { beatDuration, LookaheadTransport, LOOKAHEAD_SECONDS } from "../src/transport.js";

function harness(beats = 12, tempo = 120, swing = 0) {
  const context = { currentTime: 0, state: "running" };
  const hits = [];
  const events = [];
  const settings = {
    palo: { beats, pattern: Array(beats).fill("accent"), offbeatEnabled: true, offbeatPattern: Array(beats).fill("ghost") },
    tempo, swing, volume: 0.8, offbeatVolume: 0.55,
  };
  let stopped = 0;
  const synth = {
    playHit(time, hit, volume, offbeat = false) {
      assert.ok(time >= context.currentTime, "never schedule a missed note in the past");
      assert.ok(time < context.currentTime + LOOKAHEAD_SECONDS + 1e-9, "both subdivisions stay within the lookahead window");
      hits.push({ time, hit, volume, offbeat });
    },
    stop() { stopped++; },
  };
  const transport = new LookaheadTransport(context, synth, () => settings, (event) => events.push(event), (error) => { throw error; });
  transport.start();
  return { context, settings, hits, events, transport, stopped: () => stopped };
}

test("one hour with irregular timer callbacks stays on the original audio clock grid", () => {
  const h = harness(12, 137);
  try {
    const jitter = [0.013, 0.037, 0.019, 0.048, 0.009, 0.024];
    for (let i = 0; h.context.currentTime < 3600; i++) {
      h.context.currentTime += jitter[i % jitter.length];
      h.transport.pump();
    }
    assert.ok(h.events.length > 8200);
    for (const [index, event] of h.events.entries()) {
      assert.ok(Math.abs(event.time - (0.05 + index * 60 / 137)) < 1e-8);
      assert.equal(event.beat, index % 12);
    }
    assert.equal(h.hits.filter((hit) => !hit.offbeat).length, h.events.length);
    assert.ok(h.hits.some((hit) => hit.offbeat && hit.volume === 0.55));
  } finally { h.transport.stop(); }
});

test("3, 4 and 12 beat compases have exactly the expected duration, including swing", () => {
  for (const beats of [3, 4, 12]) for (const swing of [0, 35, 70]) {
    const h = harness(beats, 180, swing);
    try {
      const duration = Array.from({ length: beats }, (_, beat) => beatDuration(h.settings.palo, 180, swing, beat)).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(duration - beats * 60 / 180) < 1e-12);
      for (let i = 0; i < 400; i++) { h.context.currentTime += 0.025; h.transport.pump(); }
      assert.equal(h.events[beats].beat, 0);
      assert.ok(Math.abs(h.events[beats].time - h.events[0].time - duration) < 1e-10);
    } finally { h.transport.stop(); }
  }
});

test("a long callback stall skips missed notes without a burst and retains compas phase", () => {
  const h = harness();
  try {
    h.context.currentTime = 4.45;
    const before = h.hits.length;
    h.transport.pump();
    assert.ok(h.hits.length - before <= 1);
    assert.equal(h.events.at(-1).beat, 9);
    assert.ok(Math.abs(h.events.at(-1).time - 4.55) < 1e-10);
  } finally { h.transport.stop(); }
});

test("tempo changes at the next unscheduled beat; stopping cancels notes and the timer", () => {
  const h = harness();
  h.settings.tempo = 60;
  h.context.currentTime = 0.45;
  h.transport.pump();
  assert.ok(Math.abs(h.events.at(-1).duration - 1) < 1e-10);
  h.transport.stop();
  const length = h.hits.length;
  h.context.currentTime = 10;
  h.transport.pump();
  assert.equal(h.hits.length, length);
  assert.equal(h.transport.timer, null);
  assert.ok(h.stopped() >= 2);
  h.transport.start();
  assert.equal(h.events.at(-1).beat, 0);
  h.transport.stop();
});
