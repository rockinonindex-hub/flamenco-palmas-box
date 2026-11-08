import React from "react";
import { practicePatternsFor } from "../practicePatterns.js";

export default function PracticeSamples({ palo, onApply }) {
  const exercises = practicePatternsFor(palo);
  if (!exercises.length) return null;
  return (
    <details className="practice-samples">
      <summary>パロ別の練習サンプル</summary>
      <p>選ぶと現在の拍パターンを置き換えます。BPMは維持します。「Save」で保存できます。</p>
      {exercises.map((exercise) => (
        <div key={exercise.id} className="practice-option">
          <button type="button" onClick={() => onApply(exercise)}>{exercise.name}を適用</button>
          <p>{exercise.description}</p>
        </div>
      ))}
    </details>
  );
}
