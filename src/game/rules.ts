// src/game/rules.ts
import { BOARD_SIZE, WIN_LENGTH } from "./constants";
import type { Cell, Mark } from "./constants";
import { rcToIndex } from "./coords";

export type EvalResult =
  | { done: false; winner: null; line: null }
  | { done: true; winner: Mark; line: number[] }
  | { done: true; winner: null; line: null }; // 引き分け

/**
 * 5×5 盤面上の「連続3」ラインをすべて列挙する。
 * - 横: (r,c) から右方向に3
 * - 縦: (r,c) から下方向に3
 * - 斜め下: (r,c) から右下に3
 * - 斜め上: (r,c) から右上に3
 */
export function buildAllWinLines(): number[][] {
  const lines: number[][] = [];

  // 横
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c <= BOARD_SIZE - WIN_LENGTH; c++) {
      const line: number[] = [];
      for (let k = 0; k < WIN_LENGTH; k++) line.push(rcToIndex(r, c + k));
      lines.push(line);
    }
  }

  // 縦
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r <= BOARD_SIZE - WIN_LENGTH; r++) {
      const line: number[] = [];
      for (let k = 0; k < WIN_LENGTH; k++) line.push(rcToIndex(r + k, c));
      lines.push(line);
    }
  }

  // 斜め下（右下）
  for (let r = 0; r <= BOARD_SIZE - WIN_LENGTH; r++) {
    for (let c = 0; c <= BOARD_SIZE - WIN_LENGTH; c++) {
      const line: number[] = [];
      for (let k = 0; k < WIN_LENGTH; k++) line.push(rcToIndex(r + k, c + k));
      lines.push(line);
    }
  }

  // 斜め上（右上）
  for (let r = WIN_LENGTH - 1; r < BOARD_SIZE; r++) {
    for (let c = 0; c <= BOARD_SIZE - WIN_LENGTH; c++) {
      const line: number[] = [];
      for (let k = 0; k < WIN_LENGTH; k++) line.push(rcToIndex(r - k, c + k));
      lines.push(line);
    }
  }

  return lines;
}

// 生成コストを毎回払わないように、1回作って使い回す
const ALL_LINES = buildAllWinLines();

export function getAllLines(): number[][] {
  return ALL_LINES;
}

/**
 * 勝敗判定
 * - 勝ち：winner と line を返す（lineは勝ちに使ったindex配列）
 * - 引き分け：winner=null, done=true
 * - 続行：done=false
 */
export function evaluateBoard(board: Cell[]): EvalResult {
  // 勝ち判定
  for (const line of ALL_LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v && v === board[b] && v === board[c]) {
      return { done: true, winner: v, line };
    }
  }

  // 空きが残ってるか
  const hasEmpty = board.some((x) => x === null);
  if (hasEmpty) return { done: false, winner: null, line: null };

  // 全埋まり：引き分け
  return { done: true, winner: null, line: null };
}

/**
 * 空きマス一覧（AI用）
 */
export function getEmptyIndices(board: Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) out.push(i);
  }
  return out;
}
