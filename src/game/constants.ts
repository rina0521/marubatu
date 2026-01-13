// src/game/constants.ts

export type Mark = "◯" | "×";
export type Cell = Mark | null;

// 盤面の「真実」
export const BOARD_SIZE = 5; // 5x5

// 勝利条件：連続3
export const WIN_LENGTH = 3;

// 画面上で強調表示する「見せかけの盤面」(中央3x3)
export const VISIBLE_SIZE = 3;

// レイアウト
export const CELL_SIZE = 120;

// 上部にタイトル/ステータス領域を確保
export const PADDING_TOP = 120;

// 下部にリスタートボタン領域を確保（誤タップ防止）
export const PADDING_BOTTOM = 120;

// 画面サイズ（5x5が“薄く”見える前提で、全体は描画する）
export const BOARD_PX = BOARD_SIZE * CELL_SIZE;
export const WIDTH = BOARD_PX;
export const HEIGHT = BOARD_PX + PADDING_TOP + PADDING_BOTTOM;

// CPUの「外側に置いた瞬間の演出」条件
export const OUTER_REVEAL_DELAY_MS = 1000;

// 7手目 or 8手目（=0始まりでいうと moveCount が 6 or 7 の時）
// 分かりやすく「手数（1始まり）」で定義しておく
export const OUTER_REVEAL_TURN_NUMBERS = new Set<number>([8, 9]);

// 色（必要なら後で調整しやすいようにまとめる）
export const COLORS = {
  bg: "#0b0f14",
  textMain: "#e6edf3",
  textSub: "#c9d1d9",
  textHint: "#8b949e",
  x: "#79c0ff",
  o: "#ffa657",
  gridStrong: 0x30363d,
  gridWeak: 0x1f2a33, // 外側の薄い線（あとで調整）
};
