// src/game/ai.ts

import type { Cell, Mark } from "./constants";
import { getAllLines, getEmptyIndices, evaluateBoard } from "./rules";
import { isInVisibleCenter } from "./coords";

const PREFER_CENTER_THROUGH_TURN = 9;


/**
 * CPUの手を選ぶ（勝利条件を最優先）
 * - allowOuter=false の間は「中央3×3（見えてる範囲）」を主戦場にする
 * - allowOuter=true（7手目以降）になったら、勝利のために外側も許可する
 *
 * ※ 演出（1秒待つ／初回だけ等）は Scene 側が担当
 */


export function chooseCpuMove(params: {
  board: Cell[];
  cpuMark: Mark;
  playerMark: Mark;
  turnNumber: number;   // 1始まり
  allowOuter: boolean;  // Scene側の方針（8/9手目解放など）
}): number {
  const { board, cpuMark, playerMark, turnNumber, allowOuter } = params;

  const empties = getEmptyIndices(board);
  const centerOnly = empties.filter((i) => isInVisibleCenter(i));

  const preferCenter =
    turnNumber <= PREFER_CENTER_THROUGH_TURN && centerOnly.length > 0;

  // ★中央モード中は「外側の脅威」を一切見ない（防御のために外へ出ない）
  if (preferCenter) {
    const win = findImmediateWinningMove(board, cpuMark, centerOnly);
    if (win !== null) return win;

    const block = findImmediateWinningMove(board, playerMark, centerOnly);
    if (block !== null) return block;

    return pickBestByScore(board, centerOnly, cpuMark, playerMark);
  }

  // 中央が置けない／9手目以降：通常ルート
  const candidates = buildCandidates(empties, allowOuter);

  const win = findImmediateWinningMove(board, cpuMark, candidates);
  if (win !== null) return win;

  const block = findImmediateWinningMove(board, playerMark, candidates);
  if (block !== null) return block;

  return pickBestByScore(board, candidates, cpuMark, playerMark);
}


function pickBestByScore(
  board: Cell[],
  candidates: number[],
  cpuMark: Mark,
  playerMark: Mark
): number {
  const scored = candidates
    .map((idx) => ({ idx, score: evaluateMove(board, idx, cpuMark, playerMark) }))
    .sort((a, b) => b.score - a.score);

  const bestScore = scored[0]?.score ?? 0;
  const best = scored.filter((x) => x.score === bestScore);
  return best[Math.floor(Math.random() * best.length)].idx;
}

/**
 * 候補手の作り方
 * - allowOuter=false の間は中央3×3を優先（見えてる盤面に集中）
 * - ただし中央が埋まり切っているなど候補が0なら全域を許可（フェア維持）
 * - allowOuter=true なら全域を許可（勝利のため）
 */
function buildCandidates(empties: number[], allowOuter: boolean): number[] {
  if (allowOuter) return empties;

  const center = empties.filter((i) => isInVisibleCenter(i));
  return center.length > 0 ? center : empties;
}

/**
 * 即勝ち（または即ブロック）になる手を探す
 */
function findImmediateWinningMove(
  board: Cell[],
  mark: Mark,
  candidates: number[]
): number | null {
  for (const idx of candidates) {
    if (board[idx] !== null) continue;

    board[idx] = mark;
    const res = evaluateBoard(board);
    board[idx] = null;

    if (res.done && res.winner === mark) return idx;
  }
  return null;
}

/**
 * その手の「勝利への近さ」を点数化する
 * 方針：
 * - 自分の2連（= 3連勝利の一歩手前）を作れる手を高く
 * - 相手の2連を潰す手も高く（ブロックの次点）
 * - 盤面の中心寄りも少しだけ加点（同点決着のため）
 */
function evaluateMove(
  board: Cell[],
  idx: number,
  cpuMark: Mark,
  playerMark: Mark
): number {
  // 既に埋まってるなら最低（通常ここには来ないが安全）
  if (board[idx] !== null) return -1_000_000;

  // 仮置きして評価
  board[idx] = cpuMark;

  const myTwoInRow = countLinesWithK(board, cpuMark, 2);
  const myOneInRow = countLinesWithK(board, cpuMark, 1);

  // 相手の脅威軽減も見るため、一旦戻して「相手視点の2連」を計測
  board[idx] = null;
  const oppTwoInRowBefore = countLinesWithK(board, playerMark, 2);

  // その手を置いた後、相手の2連がどれだけ減るか（潰し効果）
  // ※ 厳密ではないが「そのマスが相手の勝ち筋に関与してる」目安になる
  board[idx] = cpuMark;
  const oppTwoInRowAfter = countLinesWithK(board, playerMark, 2);
  board[idx] = null;

  const blocks = Math.max(0, oppTwoInRowBefore - oppTwoInRowAfter);

  // 中央3×3の中だと少しだけ加点（同点決着用）
  const centerBonus = isInVisibleCenter(idx) ? 3 : 0;

  // スコア合成：勝利へ最短（2連）を強く優先
  // - 2連を作る：強い
  // - 相手の2連を潰す：強い（ただし即ブロックは既に処理済み）
  // - 1連増やす：弱いが意味はある
  return myTwoInRow * 100 + blocks * 80 + myOneInRow * 10 + centerBonus;
}

/**
 * 「連続3」ラインのうち、
 * - そのラインに相手のマークが含まれず
 * - 自分のマークが k 個入っている
 * ものの数を数える
 */
function countLinesWithK(board: Cell[], mark: Mark, k: number): number {
  const lines = getAllLines();
  let count = 0;

  for (const line of lines) {
    let mine = 0;
    let blocked = false;

    for (const idx of line) {
      const v = board[idx];
      if (v === null) continue;
      if (v === mark) mine++;
      else {
        blocked = true; // 相手の印がある → このラインは勝ち筋にならない
        break;
      }
    }

    if (!blocked && mine === k) count++;
  }

  return count;
}
