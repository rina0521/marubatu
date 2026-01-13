// src/scenes/drawBoard.ts

import Phaser from "phaser";
import {
  BOARD_PX,
  BOARD_SIZE,
  CELL_SIZE,
  COLORS,
  PADDING_TOP,
  VISIBLE_SIZE,
} from "../game/constants";

export type BoardVisualTuning = {
  // 外側グリッドの見え方（あとで調整しやすい）
  weakLineWidth?: number;
  weakAlpha?: number;

  // 中央3×3の見え方（強調）
  strongLineWidth?: number;
  strongAlpha?: number;

  // 外枠
  outerBorderWidth?: number;
  outerBorderAlpha?: number;
};

/**
 * 盤面のグリッド線を描く
 * - 5×5全体を薄く
 * - 中央3×3の枠と内部線を濃く
 */
export function drawBoardGrid(
  scene: Phaser.Scene,
  tuning: BoardVisualTuning = {}
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();

  const weakLineWidth = tuning.weakLineWidth ?? 2;
  const weakAlpha = tuning.weakAlpha ?? 0.18;

  const strongLineWidth = tuning.strongLineWidth ?? 6;
  const strongAlpha = tuning.strongAlpha ?? 0.9;

  const outerBorderWidth = tuning.outerBorderWidth ?? 4;
  const outerBorderAlpha = tuning.outerBorderAlpha ?? 0.35;

  // 5×5 外枠（薄め）
  g.lineStyle(outerBorderWidth, COLORS.gridWeak, outerBorderAlpha);
  g.strokeRect(0, PADDING_TOP, BOARD_PX, BOARD_PX);

  // 5×5 内部線（薄め）
  g.lineStyle(weakLineWidth, COLORS.gridWeak, weakAlpha);
  for (let i = 1; i < BOARD_SIZE; i++) {
    // 縦線
    g.beginPath();
    g.moveTo(i * CELL_SIZE, PADDING_TOP);
    g.lineTo(i * CELL_SIZE, PADDING_TOP + BOARD_PX);
    g.strokePath();

    // 横線
    g.beginPath();
    g.moveTo(0, PADDING_TOP + i * CELL_SIZE);
    g.lineTo(BOARD_PX, PADDING_TOP + i * CELL_SIZE);
    g.strokePath();
  }

  // 中央3×3を強調（太い線）
  // 5×5 の中央3×3は offset=1（行/列 1..3）
  const offset = Math.floor((BOARD_SIZE - VISIBLE_SIZE) / 2); // 1
  const startX = offset * CELL_SIZE;
  const startY = PADDING_TOP + offset * CELL_SIZE;
  const sizePx = VISIBLE_SIZE * CELL_SIZE;

  // 中央3×3の外枠
  g.lineStyle(strongLineWidth, COLORS.gridStrong, strongAlpha);
  g.strokeRect(startX, startY, sizePx, sizePx);

  // 中央3×3の内部線（2本ずつ）
  for (let i = 1; i < VISIBLE_SIZE; i++) {
    // 縦
    g.beginPath();
    g.moveTo(startX + i * CELL_SIZE, startY);
    g.lineTo(startX + i * CELL_SIZE, startY + sizePx);
    g.strokePath();

    // 横
    g.beginPath();
    g.moveTo(startX, startY + i * CELL_SIZE);
    g.lineTo(startX + sizePx, startY + i * CELL_SIZE);
    g.strokePath();
  }

  return g;
}
