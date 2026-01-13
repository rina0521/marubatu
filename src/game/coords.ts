// src/game/coords.ts

import { BOARD_SIZE, CELL_SIZE, PADDING_TOP, VISIBLE_SIZE } from "./constants";

export type RC = { r: number; c: number };

export function rcToIndex(r: number, c: number): number {
  return r * BOARD_SIZE + c;
}

export function indexToRC(index: number): RC {
  const r = Math.floor(index / BOARD_SIZE);
  const c = index % BOARD_SIZE;
  return { r, c };
}

/**
 * セルの中心座標（Textやクリック領域の中心）
 */
export function cellCenter(index: number): { x: number; y: number } {
  const { r, c } = indexToRC(index);
  const x = c * CELL_SIZE + CELL_SIZE / 2;
  const y = PADDING_TOP + r * CELL_SIZE + CELL_SIZE / 2;
  return { x, y };
}

/**
 * セルの左上座標（線を引く・矩形を置く等に使える）
 */
export function cellTopLeft(index: number): { x: number; y: number } {
  const { r, c } = indexToRC(index);
  const x = c * CELL_SIZE;
  const y = PADDING_TOP + r * CELL_SIZE;
  return { x, y };
}

/**
 * 「中央の3×3（見せかけ盤面）」かどうか
 * 5×5の中央3×3は r,c が 1..3 の範囲。
 */
export function isInVisibleCenter(index: number): boolean {
  const { r, c } = indexToRC(index);

  // BOARD_SIZE=5, VISIBLE_SIZE=3 の前提だと offset=1
  const offset = Math.floor((BOARD_SIZE - VISIBLE_SIZE) / 2);

  return (
    r >= offset &&
    r < offset + VISIBLE_SIZE &&
    c >= offset &&
    c < offset + VISIBLE_SIZE
  );
}

/**
 * 外側（中央3×3以外）かどうか
 */
export function isOuterCell(index: number): boolean {
  return !isInVisibleCenter(index);
}
