import React from "react";

const LABELS = { clara: "クララ", sorda: "ソルダ", cajon: "カホン" };

export default function VoiceMixer({ mixer, onChange }) {
  return (
    <section className="voice-mixer" aria-label="声部別ミキサー">
      <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>声部別ミキサー</h2>
      <div className="mixer-grid">
        {Object.entries(LABELS).map(([voice, name]) => (
          <div key={voice}>
            <div className="mixer-heading">
              <label htmlFor={`volume-${voice}`}>{name} {Math.round(mixer[voice].volume * 100)}%</label>
              <button type="button" aria-label={`${name} ミュート`} aria-pressed={mixer[voice].muted} onClick={() => onChange(voice, { muted: !mixer[voice].muted })}>
                {mixer[voice].muted ? "ミュート中" : "ミュート"}
              </button>
            </div>
            <input id={`volume-${voice}`} type="range" min="0" max="1" step="0.01" value={mixer[voice].volume} onChange={(e) => onChange(voice, { volume: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <p style={{ color: "#71717a", fontSize: 13, marginBottom: 0 }}>強拍はクララ＋カホン低音、通常拍・ゴーストはソルダ＋スラップ。裏拍はパルマスのみ。</p>
    </section>
  );
}
