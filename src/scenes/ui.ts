// src/scenes/ui.ts

import Phaser from "phaser";
import {
  WIDTH,
  HEIGHT,
  PADDING_BOTTOM,
  COLORS,
} from "../game/constants";

/**
 * 上部のタイトル＆ステータステキストを作る
 */
export function createStatusUI(scene: Phaser.Scene): {
  titleText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  hintText: Phaser.GameObjects.Text;
} {
  const titleText = scene.add
    .text(WIDTH / 2, 28, "Tic-Tac-Toe", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "28px",
      color: COLORS.textMain,
    })
    .setOrigin(0.5);

  const statusText = scene.add
    .text(WIDTH / 2, 70, "あなた(◯)の番です", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "22px",
      color: COLORS.textSub,
    })
    .setOrigin(0.5);

  const hintText = scene.add
    .text(
      WIDTH / 2,
      HEIGHT - PADDING_BOTTOM + 20,
      "下のボタンでリスタート",
      {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: COLORS.textHint,
      }
    )
    .setOrigin(0.5);

  return { titleText, statusText, hintText };
}

/**
 * 画面下部のリスタートボタンを作る
 * 盤面とは完全に独立したUI
 */
export function createRestartButton(
  scene: Phaser.Scene,
  onClick: () => void
): {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
} {
  const buttonWidth = 200;
  const buttonHeight = 56;

  const x = WIDTH / 2;
  const y = HEIGHT - PADDING_BOTTOM / 2;

  const bg = scene.add.rectangle(
    0,
    0,
    buttonWidth,
    buttonHeight,
    0x1f2a33,
    1
  );

  const label = scene.add.text(0, 0, "リスタート", {
    fontFamily: "system-ui, sans-serif",
    fontSize: "20px",
    color: COLORS.textMain,
  }).setOrigin(0.5);

  const container = scene.add
    .container(x, y, [bg, label])
    .setSize(buttonWidth, buttonHeight)
    .setInteractive({ useHandCursor: true });

  // hover 表現（軽め）
  container.on("pointerover", () => {
    bg.setFillStyle(0x263545, 1);
  });
  container.on("pointerout", () => {
    bg.setFillStyle(0x1f2a33, 1);
  });

  container.on("pointerdown", () => {
    onClick();
  });

  function setEnabled(enabled: boolean) {
    container.disableInteractive();
    if (enabled) {
      container.setInteractive({ useHandCursor: true });
      bg.setAlpha(1);
      label.setAlpha(1);
    } else {
      bg.setAlpha(0.4);
      label.setAlpha(0.4);
    }
  }

  return { container, setEnabled };
}
