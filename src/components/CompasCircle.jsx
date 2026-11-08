import React from "react";

const DOTS = {
  accent: { radius: 12, fill: "#27272a" },
  soft: { radius: 7, fill: "#a1a1aa" },
  ghost: { radius: 9, fill: "#71717a" },
  rest: { radius: 5, fill: "#e4e4e7" },
};

function position(index, beats, radius) {
  const angle = (index / beats) * Math.PI * 2 - Math.PI / 2;
  return { x: 170 + Math.cos(angle) * radius, y: 170 + Math.sin(angle) * radius };
}

function activate(event, callback) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
}

export default function CompasCircle({ palo, beat, offbeat, cursorRef, labelForBeat, onBeat, onOffbeat }) {
  return (
    <div className="compas-circle">
      <svg viewBox="0 0 340 340" role="group" aria-label={`${palo.name} ${palo.beats}拍のコンパス`}>
        <circle cx="170" cy="170" r="112" fill="none" stroke="#e4e4e7" strokeWidth="2" />
        <g ref={cursorRef} visibility={beat < 0 ? "hidden" : "visible"} aria-hidden="true" data-cursor="true">
          <line x1="170" y1="170" x2="170" y2="78" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        </g>
        <text x="170" y="163" textAnchor="middle" fontSize="28" fontWeight="800">{palo.beats}拍</text>
        <text x="170" y="190" textAnchor="middle" fontSize="14" fill="#71717a">1周 = 1コンパス</text>
        {palo.pattern.map((hit, i) => {
          const point = position(i, palo.beats, 112);
          const label = position(i, palo.beats, 145);
          const dot = DOTS[hit] || DOTS.rest;
          const active = beat === i;
          const number = labelForBeat(i, palo.beats, palo.countFrom);
          return (
            <g key={i} role="button" tabIndex="0" aria-label={`円形 拍 ${number} ${hit}`} onClick={() => onBeat(i)} onKeyDown={(e) => activate(e, () => onBeat(i))} className="circle-beat" data-beat={i} data-active={active}>
              <circle cx={point.x} cy={point.y} r="30" fill="transparent" />
              {active && <circle cx={point.x} cy={point.y} r="21" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />}
              <circle cx={point.x} cy={point.y} r={dot.radius} fill={active ? "#d97706" : dot.fill} />
              <text x={label.x} y={label.y} dy=".35em" textAnchor="middle" fontSize="16" fontWeight={hit === "accent" ? 900 : 500}>{number}</text>
            </g>
          );
        })}
        {palo.offbeatEnabled && palo.offbeatPattern.map((hit, i) => {
          const point = position(i + 0.5, palo.beats, 112);
          return (
            <g key={i} role="button" tabIndex="0" aria-label={`円形 裏拍 ${labelForBeat(i, palo.beats, palo.countFrom)} ${hit}`} onClick={() => onOffbeat(i)} onKeyDown={(e) => activate(e, () => onOffbeat(i))} className="circle-beat">
              <circle cx={point.x} cy={point.y} r="15" fill="transparent" />
              <circle cx={point.x} cy={point.y} r={hit === "rest" ? 3 : hit === "ghost" ? 5 : 7} fill={offbeat === i ? "#d97706" : "#c4b5a0"} />
            </g>
          );
        })}
      </svg>
      <p className="circle-hint">大きな濃色の点：強拍 · 小：通常拍 · 中：ゴースト<br />点をタップするとパターンを編集できます。</p>
    </div>
  );
}
