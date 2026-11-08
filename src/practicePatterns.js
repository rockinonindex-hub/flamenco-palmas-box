// Beat numbers, not array positions: a Bulerías count beginning at 12 stays correct.
// These are optional one-compás exercises; DEFAULT_PALOS and saved edits are untouched.
const EXERCISES = {
  solea: [
    { id: "marcaje", name: "基本マルカヘ", description: "3・6・8・10・12を明確に。まず裏拍なしでコンパスを確認。", accent: [3, 6, 8, 10, 12], soft: [1, 2, 4, 5, 7, 9, 11] },
    { id: "cierre", name: "シエレ：10で締める", description: "10で締め、11・12は休む。無音の2拍も数えて次の1へ。", accent: [3, 6, 8, 10], soft: [1, 2, 4, 5, 7, 9] },
  ],
  alegrias: [
    { id: "contratiempo", name: "基本＋コントラティエンポ", description: "3・6・8・10・12の骨格に、控えめな裏拍を添える。", accent: [3, 6, 8, 10, 12], soft: [1, 2, 4, 5, 7, 9, 11], offbeat: [1, 4, 7, 9, 11] },
    { id: "cierre", name: "シエレ：10で締める", description: "10のアクセントで締めて11・12を休む、短い締めの練習。", accent: [3, 6, 8, 10], soft: [1, 2, 4, 5, 7, 9], offbeat: [4, 7] },
  ],
  bulerias: [
    { id: "base", name: "12拍の基本形", description: "12・3・6・8・10にアクセント。12から数える設定で骨格をつかむ。", accent: [12, 3, 6, 8, 10], soft: [1, 2, 4, 5, 7, 9, 11] },
    { id: "contratiempo", name: "間とコントラティエンポ", description: "1・4・11の表を休み、裏拍との掛け合いを練習。基本形から段階的に。", accent: [12, 3, 6, 8, 10], soft: [2, 5, 7, 9], offbeat: [1, 2, 4, 5, 7, 9] },
  ],
  "solea-por-bulerias": [
    { id: "base", name: "12拍のマルカヘ", description: "12・3・6・8・10の骨格を中速で練習。", accent: [12, 3, 6, 8, 10], soft: [1, 2, 4, 5, 7, 9, 11] },
    { id: "cierre", name: "シエレ：10で締める", description: "12から始め、10で締めて11を休む。次の12へつなぐ。", accent: [12, 3, 6, 8, 10], soft: [1, 2, 4, 5, 7, 9], offbeat: [2, 5, 7] },
  ],
  seguiriya: [
    { id: "base", name: "2＋2＋3＋3＋2", description: "12分割の1・3・5・8・11が五つのまとまりの頭。数字は分割番号。", accent: [1, 3, 5, 8, 11], soft: [2, 4, 6, 7, 9, 10, 12] },
    { id: "space", name: "五つの頭だけ", description: "五つのまとまりの頭だけを鳴らし、間を保つ練習。", accent: [1, 3, 5, 8, 11] },
  ],
  tangos: [
    { id: "base", name: "2・4のマルカヘ", description: "1を休み、2・4を強く、3を軽く。休符の1も保つ。", accent: [2, 4], soft: [3] },
    { id: "contratiempo", name: "2・4＋裏拍", description: "2・4を軸に、1・2・3の後の裏拍を小さく添える。", accent: [2, 4], soft: [3], offbeat: [1, 2, 3] },
  ],
  tientos: [
    { id: "base", name: "ゆっくり2・4", description: "1を休む4拍のマルカヘ。ゆっくりしたテンポで間を聴く。", accent: [2, 4], soft: [3] },
    { id: "contratiempo", name: "疎らな裏拍", description: "1・3の後だけに小さな裏拍を加え、強拍との差を保つ。", accent: [2, 4], soft: [3], offbeat: [1, 3] },
  ],
  rumba: [
    { id: "base", name: "4拍のマルカヘ", description: "1・3を軸に、2・4の後へ軽い裏拍。", accent: [1, 3], soft: [2, 4], offbeat: [2, 4] },
    { id: "syncopation", name: "シンコペーション", description: "2の表を休み、その後の裏を通常音で鳴らす。前後の小さな裏と区別する。", accent: [1], soft: [3, 4], offbeat: [1, 4], offbeatSoft: [2] },
  ],
  sevillanas: [
    { id: "base", name: "3拍の基本形", description: "1を強く、2・3を軽く。3拍の伴奏ループ。", accent: [1], soft: [2, 3] },
    { id: "pickup", name: "3の裏から次の1へ", description: "3の後へ小さな裏拍を加え、次の1へつなぐ。", accent: [1], soft: [2, 3], offbeat: [3] },
  ],
  fandangos: [
    { id: "base", name: "3拍のマルカヘ", description: "1を軸に2・3を軽く鳴らす、3拍の伴奏練習。", accent: [1], soft: [2, 3] },
    { id: "space", name: "2を休む練習", description: "1と軽い3だけを鳴らし、休符の2でテンポを保つ。", accent: [1], soft: [3] },
  ],
};

const METERS = { tangos: 4, tientos: 4, rumba: 4, sevillanas: 3, fandangos: 3 };

export function practicePatternsFor(palo) {
  if (palo.beats !== (METERS[palo.id] || 12)) return [];
  return (EXERCISES[palo.id] || []).map((exercise) => {
    const pattern = Array(palo.beats).fill("rest");
    const offbeatPattern = Array(palo.beats).fill("rest");
    const index = (number) => palo.beats === 12 && palo.countFrom === 12 ? number % 12 : number - 1;
    for (const number of exercise.accent || []) pattern[index(number)] = "accent";
    for (const number of exercise.soft || []) pattern[index(number)] = "soft";
    for (const number of exercise.offbeat || []) offbeatPattern[index(number)] = "ghost";
    for (const number of exercise.offbeatSoft || []) offbeatPattern[index(number)] = "soft";
    return {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      pattern,
      offbeatPattern,
      offbeatEnabled: offbeatPattern.some((hit) => hit !== "rest"),
    };
  });
}
