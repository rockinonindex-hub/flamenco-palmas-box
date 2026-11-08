# flamenco-palmas-box
A simple flamenco palmas rhythm box for practicing compás.

## 開発と確認

Node.js 22.12以降を使用します（推奨: 24）。

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

`http://localhost:5173/flamenco-palmas-box/` を開きます。同じWi-FiのiPhoneからは
`localhost` をPCのLANアドレスに置き換え、Playをタップします。

```sh
npm test
npm run build
```

段階ごとの操作・確認方法は [docs/verification.md](docs/verification.md) を参照してください。

## 表示と音

- SVGの輪っか／従来の編集表示を切替可能。3・4・12拍、12始まりの数え方に対応。
- 目隠しモードでは輪っか・拍番号を隠し、音を止めずに練習できます。
- 描画はrequestAnimationFrameで音の時刻を参照し、発音の予約から独立しています。
- クララ・ソルダ・カホン低音をWeb Audioだけで合成。サンプルファイルなし。
- 声部ごとの音量とミュート、従来の表拍／裏拍音量・Swingを併用できます。
- 25msのタイマーで120ms先まで予約し、AudioContextの時刻で発音します。
- スマートフォンでは再生・保存ボタンを画面下に固定。詳細な編集・音量設定は折りたたんでいます。

現在の音源の固定パラメーターと検証方法は [docs/audio-spec.md](docs/audio-spec.md) を参照してください。

## 練習サンプルと保存

各パロに2種類、合計20の練習サンプルを追加しました。「パロ別の練習サンプル」から適用します。
基本マルカヘ、コントラティエンポ、シエレ、休符の練習など、パロごとに内容が異なります。
セギリージャは12分割上の5つのまとまりを表します。

元の10パロの初期データと、保存済みの編集内容は維持しています。練習サンプルの適用は
現在の表拍・裏拍だけを置き換え、BPMは変えません。Saveで保存し、Resetで元の初期設定へ戻ります。
保存キーとパロのデータ構造は従来どおりで、ミキサーの設定はパロとは別の項目として保存しています。

iPhone実機のSafariでの音質、長時間再生、画面ロックからの復帰は実機で確認してください。
OSが音声を中断した場合はPlayで再開できます。
