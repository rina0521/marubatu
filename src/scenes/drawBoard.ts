// src/scenes/drawBoard.ts

import Phaser from "phaser";
import {
  BOARD_PX,
  BOARD_SIZE,
  CELL_SIZE,
  COLORS,
  PADDING_TOP,
  PADDING_LEFT,
  VISIBLE_SIZE,
} from "../game/constants";

export type BoardVisualTuning = {
  weakLineWidth?: number;
  weakAlpha?: number;

  strongLineWidth?: number;
  strongAlpha?: number;

  outerBorderWidth?: number;
  outerBorderAlpha?: number;
};

/**
 * 盤面グリッドを描画する
 * - 5×5 全体は薄く
 * - 中央 3×3 は強調
 * - 左右中央寄せ対応（PADDING_LEFT）
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

  // === 5×5 外枠（薄め）===
  g.lineStyle(outerBorderWidth, COLORS.gridWeak, outerBorderAlpha);
  g.strokeRect(
    PADDING_LEFT,
    PADDING_TOP,
    BOARD_PX,
    BOARD_PX
  );

  // === 5×5 内部線（薄め）===
  g.lineStyle(weakLineWidth, COLORS.gridWeak, weakAlpha);

  for (let i = 1; i < BOARD_SIZE; i++) {
    // 縦線
    g.beginPath();
    g.moveTo(
      PADDING_LEFT + i * CELL_SIZE,
      PADDING_TOP
    );
    g.lineTo(
      PADDING_LEFT + i * CELL_SIZE,
      PADDING_TOP + BOARD_PX
    );
    g.strokePath();

    // 横線
    g.beginPath();
    g.moveTo(
      PADDING_LEFT,
      PADDING_TOP + i * CELL_SIZE
    );
    g.lineTo(
      PADDING_LEFT + BOARD_PX,
      PADDING_TOP + i * CELL_SIZE
    );
    g.strokePath();
  }

  // === 中央 3×3 を強調 ===
  const offset = Math.floor((BOARD_SIZE - VISIBLE_SIZE) / 2); // =1
  const startX = PADDING_LEFT + offset * CELL_SIZE;
  const startY = PADDING_TOP + offset * CELL_SIZE;
  const sizePx = VISIBLE_SIZE * CELL_SIZE;

  // 中央 3×3 の外枠
  g.lineStyle(strongLineWidth, COLORS.gridStrong, strongAlpha);
  g.strokeRect(startX, startY, sizePx, sizePx);

  // 中央 3×3 の内部線
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
