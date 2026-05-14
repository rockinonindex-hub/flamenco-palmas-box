import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_PALOS = [
  {
    id: "solea",
    name: "Soleá",
    beats: 12,
    tempo: 92,
    countFrom: 1,
    pattern: ["soft", "soft", "accent", "soft", "soft", "accent", "soft", "accent", "soft", "accent", "soft", "accent"],
  },
  {
    id: "alegrias",
    name: "Alegrías",
    beats: 12,
    tempo: 132,
    countFrom: 1,
    pattern: ["soft", "soft", "accent", "soft", "soft", "accent", "soft", "accent", "soft", "accent", "soft", "accent"],
  },
  {
    id: "bulerias",
    name: "Bulerías",
    beats: 12,
    tempo: 180,
    countFrom: 12,
    pattern: ["accent", "soft", "soft", "accent", "soft", "soft", "accent", "accent", "soft", "accent", "soft", "soft"],
  },
  {
    id: "solea-por-bulerias",
    name: "Soleá por Bulerías",
    beats: 12,
    tempo: 150,
    countFrom: 12,
    pattern: ["accent", "soft", "soft", "accent", "soft", "soft", "accent", "accent", "soft", "accent", "soft", "soft"],
  },
  {
    id: "seguiriya",
    name: "Seguiriya",
    beats: 12,
    tempo: 110,
    countFrom: 1,
    pattern: ["accent", "soft", "accent", "soft", "accent", "soft", "soft", "accent", "soft", "soft", "accent", "soft"],
  },
  {
    id: "tangos",
    name: "Tangos",
    beats: 4,
    tempo: 104,
    countFrom: 1,
    pattern: ["accent", "soft", "accent", "soft"],
  },
  {
    id: "tientos",
    name: "Tientos",
    beats: 4,
    tempo: 82,
    countFrom: 1,
    pattern: ["accent", "soft", "accent", "soft"],
  },
  {
    id: "rumba",
    name: "Rumba",
    beats: 4,
    tempo: 112,
    countFrom: 1,
    pattern: ["accent", "ghost", "soft", "soft"],
  },
  {
    id: "sevillanas",
    name: "Sevillanas",
    beats: 3,
    tempo: 124,
    countFrom: 1,
    pattern: ["accent", "soft", "soft"],
  },
  {
    id: "fandangos",
    name: "Fandangos",
    beats: 3,
    tempo: 116,
    countFrom: 1,
    pattern: ["accent", "soft", "soft"],
  },
];

const STORAGE_KEY = "flamenco-palmas-rhythm-box-v2";
const VALID_HITS = ["accent", "soft", "ghost", "rest"];

function labelForBeat(index, beats, countFrom) {
  if (beats === 12 && countFrom === 12) {
    return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11][index];
  }
  return index + 1;
}

function nextHit(value) {
  if (value === "accent") return "rest";
  if (value === "rest") return "ghost";
  if (value === "ghost") return "soft";
  return "accent";
}

function hitLabel(value) {
  return {
    accent: "強",
    soft: "弱",
    ghost: "裏",
    rest: "休",
  }[value] || "?";
}

function hitStyle(value) {
  const styles = {
    accent: {
      background: "#18181b",
      color: "white",
      borderColor: "#18181b",
      fontWeight: 800,
    },
    soft: {
      background: "white",
      color: "#18181b",
      borderColor: "#d4d4d8",
    },
    ghost: {
      background: "#f4f4f5",
      color: "#52525b",
      borderColor: "#a1a1aa",
      borderStyle: "dashed",
    },
    rest: {
      background: "#fafafa",
      color: "#c4c4c7",
      borderColor: "#e4e4e7",
    },
  };
  return styles[value] || styles.rest;
}

function normalizePalo(palo) {
  const beats = [3, 4, 12].includes(Number(palo.beats)) ? Number(palo.beats) : 12;
  const pattern = Array.from({ length: beats }, (_, index) => {
    const hit = Array.isArray(palo.pattern) ? palo.pattern[index] : null;
    return VALID_HITS.includes(hit) ? hit : index === 0 ? "accent" : "soft";
  });

  return {
    id: String(palo.id || `palo-${Date.now()}`),
    name: String(palo.name || "Custom"),
    beats,
    tempo: Number.isFinite(Number(palo.tempo)) ? Math.min(240, Math.max(40, Number(palo.tempo))) : 100,
    countFrom: beats === 12 && Number(palo.countFrom) === 12 ? 12 : 1,
    pattern,
  };
}

function runSelfTests() {
  const failures = [];

  function test(name, condition) {
    if (!condition) failures.push(name);
  }

  test("12-count labels start at 12", labelForBeat(0, 12, 12) === 12);
  test("12-count labels wrap to 11", labelForBeat(11, 12, 12) === 11);
  test("normal labels start at 1", labelForBeat(0, 12, 1) === 1);
  test("hit cycle accent to rest", nextHit("accent") === "rest");
  test("hit cycle rest to ghost", nextHit("rest") === "ghost");
  test("hit cycle ghost to soft", nextHit("ghost") === "soft");
  test("hit cycle soft to accent", nextHit("soft") === "accent");
  test("default patterns match beat length", DEFAULT_PALOS.every((p) => p.pattern.length === p.beats));
  test("default hits are valid", DEFAULT_PALOS.every((p) => p.pattern.every((hit) => VALID_HITS.includes(hit))));
  test("normalize repairs bad pattern length", normalizePalo({ id: "x", name: "X", beats: 4, pattern: ["accent"] }).pattern.length === 4);

  if (failures.length) {
    console.error("Flamenco Compás Box self-test failures:", failures);
  } else {
    console.info("Flamenco Compás Box self-tests passed.");
  }
}

function Icon({ children }) {
  return <span style={{ display: "inline-block", width: 20, textAlign: "center" }}>{children}</span>;
}

function AppButton({ children, onClick, disabled, variant = "solid", style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${variant === "solid" ? "#18181b" : "#d4d4d8"}`,
        background: variant === "solid" ? "#18181b" : "white",
        color: variant === "solid" ? "white" : "#18181b",
        padding: "10px 14px",
        borderRadius: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 42,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        border: "1px solid #d4d4d8",
        background: "white",
        cursor: "pointer",
        fontWeight: 900,
        fontSize: 18,
      }}
    >
      {children}
    </button>
  );
}

function cardStyle(extra = {}) {
  return {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #e4e4e7",
    borderRadius: 24,
    boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
    padding: 20,
    ...extra,
  };
}

function inputStyle(extra = {}) {
  return {
    borderRadius: 16,
    border: "1px solid #d4d4d8",
    background: "white",
    padding: "10px 12px",
    color: "#18181b",
    ...extra,
  };
}

function safeLocalStorageGet(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (_) {}
}

function safeLocalStorageRemove(key) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (_) {}
}

export default function FlamencoPalmasRhythmBox() {
  const [palos, setPalos] = useState(DEFAULT_PALOS);
  const [selectedId, setSelectedId] = useState("solea");
  const [tempo, setTempo] = useState(92);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [volume, setVolume] = useState(0.8);
  const [swing, setSwing] = useState(0);
  const [status, setStatus] = useState("Ready");

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const beatRef = useRef(0);
  const nextTimeRef = useRef(0);
  const tempoRef = useRef(tempo);
  const selectedRef = useRef(null);
  const volumeRef = useRef(volume);
  const swingRef = useRef(swing);

  const selected = useMemo(() => palos.find((p) => p.id === selectedId) || palos[0], [palos, selectedId]);

  useEffect(() => {
    runSelfTests();

    const saved = safeLocalStorageGet(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.palos) && parsed.palos.length) {
        const normalized = parsed.palos.map(normalizePalo);
        setPalos(normalized);

        const nextSelectedId = normalized.some((p) => p.id === parsed.selectedId) ? parsed.selectedId : normalized[0].id;
        setSelectedId(nextSelectedId);
      }
      if (typeof parsed.tempo === "number") setTempo(Math.min(240, Math.max(40, parsed.tempo)));
      if (typeof parsed.volume === "number") setVolume(Math.min(1, Math.max(0, parsed.volume)));
      if (typeof parsed.swing === "number") setSwing(Math.min(70, Math.max(0, parsed.swing)));
      setStatus("Saved settings loaded");
    } catch (_) {
      setStatus("Saved settings could not be loaded, using defaults");
    }
  }, []);

  useEffect(() => {
    tempoRef.current = tempo;
    selectedRef.current = selected;
    volumeRef.current = volume;
    swingRef.current = swing;
  }, [tempo, selected, volume, swing]);

  useEffect(() => {
    if (!selected) return;
    setTempo(selected.tempo);
    beatRef.current = 0;
    setCurrentBeat(-1);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  function ensureAudio() {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setStatus("This browser does not support Web Audio API");
      return null;
    }

    if (!audioRef.current) {
      audioRef.current = new AudioContextClass();
    }
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }

  function noiseBuffer(ctx, seconds = 0.045) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const fade = Math.pow(1 - i / data.length, 2.2);
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    return buffer;
  }

  function playClap(time, type) {
    if (type === "rest") return;

    const ctx = ensureAudio();
    if (!ctx) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    source.buffer = noiseBuffer(ctx, type === "accent" ? 0.06 : 0.04);
    filter.type = "bandpass";
    filter.frequency.value = type === "accent" ? 1900 : type === "ghost" ? 1200 : 1500;
    filter.Q.value = type === "accent" ? 1.25 : 0.9;

    const amp = type === "accent" ? 0.85 : type === "ghost" ? 0.22 : 0.48;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * volumeRef.current), time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (type === "accent" ? 0.075 : 0.05));

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(time);
  }

  function schedule() {
    const ctx = ensureAudio();
    const palo = selectedRef.current;
    if (!ctx || !palo) return;

    const lookAhead = 0.12;
    while (nextTimeRef.current < ctx.currentTime + lookAhead) {
      const beatIndex = beatRef.current % palo.beats;
      const hit = palo.pattern[beatIndex] || "rest";
      playClap(nextTimeRef.current, hit);

      const uiDelay = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
      window.setTimeout(() => setCurrentBeat(beatIndex), uiDelay);

      const base = 60 / tempoRef.current;
      const swingAmount = swingRef.current / 100;
      const addSwing = beatIndex % 2 === 0 ? base * swingAmount * 0.18 : -base * swingAmount * 0.18;
      nextTimeRef.current += Math.max(0.08, base + addSwing);
      beatRef.current += 1;
    }
  }

  function start() {
    const ctx = ensureAudio();
    if (!ctx) return;

    if (timerRef.current) window.clearInterval(timerRef.current);
    setIsPlaying(true);
    setStatus("Playing");
    beatRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.05;
    schedule();
    timerRef.current = window.setInterval(schedule, 25);
  }

  function stop() {
    setIsPlaying(false);
    setStatus("Stopped");
    setCurrentBeat(-1);
    beatRef.current = 0;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function updateSelectedPalo(updater) {
    setPalos((prev) => prev.map((p) => (p.id === selectedId ? normalizePalo(updater(p)) : p)));
  }

  function updatePattern(index) {
    updateSelectedPalo((p) => ({
      ...p,
      pattern: p.pattern.map((hit, i) => (i === index ? nextHit(hit) : hit)),
    }));
  }

  function savePreset() {
    const updatedPalos = palos.map((p) => (p.id === selectedId ? { ...p, tempo } : p)).map(normalizePalo);
    setPalos(updatedPalos);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify({ palos: updatedPalos, selectedId, tempo, volume, swing }));
    setStatus("Saved");
  }

  function resetPreset() {
    stop();
    setPalos(DEFAULT_PALOS);
    setSelectedId("solea");
    setTempo(92);
    setVolume(0.8);
    setSwing(0);
    safeLocalStorageRemove(STORAGE_KEY);
    setStatus("Reset to defaults");
  }

  function addCustomPalo() {
    const id = `custom-${Date.now()}`;
    const custom = normalizePalo({
      id,
      name: `Custom ${palos.filter((p) => p.id.startsWith("custom")).length + 1}`,
      beats: 12,
      tempo,
      countFrom: 1,
      pattern: Array.from({ length: 12 }, (_, i) => (i === 0 ? "accent" : "soft")),
    });
    setPalos((prev) => [...prev, custom]);
    setSelectedId(id);
    setStatus("Custom palo added");
  }

  function deleteCustomPalo() {
    if (!selected.id.startsWith("custom")) return;
    stop();
    setPalos((prev) => prev.filter((p) => p.id !== selected.id));
    setSelectedId("solea");
    setStatus("Custom palo deleted");
  }

  function renameSelected(name) {
    updateSelectedPalo((p) => ({ ...p, name }));
  }

  function changeBeats(beats) {
    updateSelectedPalo((p) => {
      const nextPattern = Array.from({ length: beats }, (_, i) => p.pattern[i] || (i === 0 ? "accent" : "soft"));
      return { ...p, beats, pattern: nextPattern, countFrom: beats === 12 ? p.countFrom : 1 };
    });
    beatRef.current = 0;
    setCurrentBeat(-1);
  }

  function changeTempo(nextTempo) {
    const cleanTempo = Math.min(240, Math.max(40, Number(nextTempo)));
    setTempo(cleanTempo);
    updateSelectedPalo((p) => ({ ...p, tempo: cleanTempo }));
  }

  if (!selected) {
    return <div style={{ padding: 24 }}>No palo selected.</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fafaf9 0%, #f4f4f5 50%, #f5f5f4 100%)",
        color: "#18181b",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                background: "white",
                border: "1px solid #e4e4e7",
                padding: "6px 12px",
                fontSize: 14,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                marginBottom: 10,
              }}
            >
              <Icon>👏</Icon> Palmas Rhythm Box
            </div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1, margin: 0, letterSpacing: -1.5 }}>
              Flamenco Compás Box
            </h1>
            <p style={{ color: "#52525b", marginTop: 10, marginBottom: 0 }}>
              パロごとのパルマを鳴らす、練習用リズムボックス。外部ライブラリなしで動きます。
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AppButton onClick={isPlaying ? stop : start}>
              <Icon>{isPlaying ? "■" : "▶"}</Icon>
              {isPlaying ? "Stop" : "Play"}
            </AppButton>
            <AppButton variant="outline" onClick={savePreset}>
              <Icon>💾</Icon> Save
            </AppButton>
            <AppButton variant="outline" onClick={resetPreset}>
              <Icon>↺</Icon> Reset
            </AppButton>
          </div>
        </div>

        <div style={cardStyle({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 })}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: "#52525b" }}>Palo</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={inputStyle({ width: "100%" })}>
              {palos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: "#71717a" }}>Status: {status}</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: "#52525b" }}>Tempo: {tempo} BPM</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SmallButton onClick={() => changeTempo(tempo - 2)}>−</SmallButton>
              <input type="range" min="40" max="240" value={tempo} onChange={(e) => changeTempo(Number(e.target.value))} style={{ width: "100%" }} />
              <SmallButton onClick={() => changeTempo(tempo + 2)}>＋</SmallButton>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: "#52525b" }}>Volume: {Math.round(volume * 100)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: "100%" }} />
            <label style={{ fontSize: 14, fontWeight: 700, color: "#52525b" }}>Humanize / Swing: {swing}%</label>
            <input type="range" min="0" max="70" value={swing} onChange={(e) => setSwing(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
        </div>

        <div style={cardStyle({ overflow: "hidden" })}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 220 }}>
              <input
                value={selected.name}
                onChange={(e) => renameSelected(e.target.value)}
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid transparent",
                  outline: "none",
                  maxWidth: "100%",
                  color: "#18181b",
                }}
              />
              <p style={{ fontSize: 14, color: "#71717a", marginTop: 4, marginBottom: 0 }}>
                丸をクリックすると 強 → 休 → 裏 → 弱 → 強 と切り替わります。
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={selected.beats} onChange={(e) => changeBeats(Number(e.target.value))} style={inputStyle()}>
                <option value={12}>12 beats</option>
                <option value={4}>4 beats</option>
                <option value={3}>3 beats</option>
              </select>
              {selected.beats === 12 && (
                <select
                  value={selected.countFrom}
                  onChange={(e) => updateSelectedPalo((p) => ({ ...p, countFrom: Number(e.target.value) }))}
                  style={inputStyle()}
                >
                  <option value={1}>count 1-12</option>
                  <option value={12}>count 12-11</option>
                </select>
              )}
              <AppButton variant="outline" onClick={addCustomPalo}>Custom</AppButton>
              <AppButton variant="outline" onClick={deleteCustomPalo} disabled={!selected.id.startsWith("custom")}>
                <Icon>🗑</Icon> Delete
              </AppButton>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
              gap: 12,
              marginTop: 22,
            }}
          >
            {selected.pattern.map((hit, i) => {
              const active = currentBeat === i;
              return (
                <button
                  type="button"
                  key={`${selected.id}-${i}`}
                  onClick={() => updatePattern(i)}
                  aria-label={`Beat ${labelForBeat(i, selected.beats, selected.countFrom)} ${hitLabel(hit)}`}
                  style={{
                    position: "relative",
                    borderRadius: 24,
                    border: "1px solid",
                    padding: 12,
                    minHeight: 112,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transform: active ? "scale(1.04)" : "scale(1)",
                    boxShadow: active ? "0 0 0 5px rgba(161,161,170,0.35)" : "none",
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    ...hitStyle(hit),
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 4,
                        borderRadius: 20,
                        border: "3px solid rgba(113,113,122,0.6)",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <span style={{ fontSize: 12, opacity: 0.6 }}>beat</span>
                  <span style={{ fontSize: 34, fontWeight: 950 }}>{labelForBeat(i, selected.beats, selected.countFrom)}</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{hitLabel(hit)}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 20, fontSize: 14 }}>
            <div style={{ borderRadius: 16, background: "#18181b", color: "white", padding: 12 }}>強：乾いた大きめのパルマ</div>
            <div style={{ borderRadius: 16, background: "white", border: "1px solid #d4d4d8", padding: 12 }}>弱：軽いパルマ</div>
            <div style={{ borderRadius: 16, background: "#f4f4f5", border: "1px dashed #a1a1aa", padding: 12 }}>裏：小さな補助音</div>
            <div style={{ borderRadius: 16, background: "#fafafa", border: "1px solid #e4e4e7", color: "#a1a1aa", padding: 12 }}>休：鳴らさない</div>
          </div>
        </div>
      </div>
    </div>
  );
}
