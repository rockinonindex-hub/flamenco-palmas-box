import test from "node:test";
import assert from "node:assert/strict";
import { practicePatternsFor } from "../src/practicePatterns.js";

test("Bulerías exercises accent 12, 3, 6, 8 and 10 under either count origin", () => {
  for (const countFrom of [1, 12]) {
    const palo = { id: "bulerias", beats: 12, countFrom };
    const before = JSON.stringify(palo);
    const sample = practicePatternsFor(palo)[0];
    const accents = sample.pattern.flatMap((hit, i) => hit === "accent" ? [countFrom === 12 ? (i + 11) % 12 + 1 : i + 1] : []);
    assert.deepEqual(accents.sort((a, b) => a - b), [3, 6, 8, 10, 12]);
    assert.equal(JSON.stringify(palo), before, "offering samples never mutates the current preset");
  }
});

test("Soleá cierre leaves 11 and 12 silent; Tangos starts with a rest and accents 2 and 4", () => {
  const cierre = practicePatternsFor({ id: "solea", beats: 12, countFrom: 1 })[1];
  assert.equal(cierre.pattern[9], "accent");
  assert.deepEqual(cierre.pattern.slice(10), ["rest", "rest"]);
  const tangos = practicePatternsFor({ id: "tangos", beats: 4, countFrom: 1 })[0];
  assert.deepEqual(tangos.pattern, ["rest", "accent", "soft", "accent"]);
});

test("samples are unavailable for edited meters and custom palos", () => {
  assert.deepEqual(practicePatternsFor({ id: "bulerias", beats: 4 }), []);
  assert.deepEqual(practicePatternsFor({ id: "custom-1", beats: 12 }), []);
});
