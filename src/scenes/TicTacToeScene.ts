// src/scenes/TicTacToeScene.ts

import Phaser from "phaser";
import {
  BOARD_SIZE,
  COLORS,
  OUTER_REVEAL_DELAY_MS,
  OUTER_REVEAL_TURN_NUMBERS,
  type Cell,
  type Mark,
  // ★ drawBoard.tsと整合するために使う（すでにconstantsにある前提）
  BOARD_PX,
  CELL_SIZE,
  PADDING_LEFT,
  PADDING_TOP,
} from "../game/constants";
import { cellCenter, isOuterCell } from "../game/coords";
import { chooseCpuMove } from "../game/ai";
import { evaluateBoard } from "../game/rules";
import { drawBoardGrid } from "./drawBoard";
import { createRestartButton, createStatusUI } from "./ui";

const TARGET_HEIGHT = 90;

export class TicTacToeScene extends Phaser.Scene {
  // --- ゲーム状態（TypeScriptなので明示宣言） ---
  board: Cell[];
  turn: Mark; // "◯" or "×"
  gameOver: boolean;

  // 手数（1始まりで扱う：1手目=1, ...）
  turnNumber: number;

  // CPUが「外側に置いた瞬間の演出」をもう使ったか
  hasRevealedOuterMove: boolean;

  // --- 表示オブジェクト ---
  cellImages: Phaser.GameObjects.Image[];
  statusText!: Phaser.GameObjects.Text;
  hintText!: Phaser.GameObjects.Text;

  // ★ 5×5セル境界の“浮き出しオーバーレイ”（外周の太枠は描かない）
  outerGridOverlay!: Phaser.GameObjects.Graphics;
  isOuterGridRevealed: boolean = false;

  constructor() {
    super("TicTacToeScene");

    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

    this.cellImages = [];
  }

  preload() {
    this.load.image("barnacle", "/marubatu/assets/barnacle.png");
    this.load.image("barnacle_bite", "/marubatu/assets/barnacle_bite.png");
    this.load.image("barnacle_dead", "/marubatu/assets/barnacle_dead.png");
    this.load.image("ghost", "/marubatu/assets/ghost.png");
    this.load.image("ghost_normal", "/marubatu/assets/ghost_normal.png");
    this.load.image("ghost_dead", "/marubatu/assets/ghost_dead.png");
    this.load.image("title", "/marubatu/assets/title.png");
    this.load.image("restart_button", "/marubatu/assets/restart.png");
    this.load.image("sparkle", "/marubatu/assets/sparkle.png");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // 盤面グリッド（5×5薄く + 中央3×3強調）
    drawBoardGrid(this, {
      weakAlpha: 0.12,
      weakLineWidth: 2,
    });

    // ★ “後から浮き出る” 5×5セル境界オーバーレイを用意（内側線だけ）
    this.outerGridOverlay = this.add.graphics();
    this.outerGridOverlay.setDepth(5); // 盤面より上（UIより下にしたいなら調整）
    this.outerGridOverlay.setAlpha(0);
    this.outerGridOverlay.setVisible(false);
    this.drawOuterGridOverlay();

    // UI
    const ui = createStatusUI(this);
    this.statusText = ui.statusText;
    this.hintText = ui.hintText;

    // リスタートボタン
    createRestartButton(this, () => this.resetGame());

    // 25セル分のテキスト＋クリック領域
    this.cellImages = [];
    for (let idx = 0; idx < this.board.length; idx++) {
      const { x, y } = cellCenter(idx);

      const image = this.add.image(x, y, "barnacle").setVisible(false).setOrigin(0.5);

      this.cellImages.push(image);

      // クリック領域（透明）
      const r = this.add
        .rectangle(x, y, 120, 120, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      r.on("pointerdown", () => this.handlePlayerMove(idx));
    }

    // 初期表示
    this.updateStatusText();
  }

private handlePlayerMove(idx: number) {
  if (this.gameOver) return;
  if (this.turn !== "◯") return;
  if (this.board[idx] !== null) return;

  const afterPlace = () => {
    this.placeMark(idx, "◯");

    const res = evaluateBoard(this.board);
    if (res.done) {
      this.finish(res);
      return;
    }

    // CPUターンへ（ここは1回しか通らない）
    this.turn = "×";
    this.turnNumber += 1;
    this.updateStatusText();

    this.runCpuTurn();
  };

  // ★ プレイヤーが「初めて外側に置く」なら、先にフチを出してから置く
  if (isOuterCell(idx) && !this.isOuterGridRevealed) {
    this.revealOuterGrid(afterPlace);
    return; // ★ これ重要：二重実行を防ぐ
  }

  afterPlace();
}


  private runCpuTurn() {
    if (this.gameOver) return;

    const allowOuter = OUTER_REVEAL_TURN_NUMBERS.has(this.turnNumber);
    const cpuIdx = chooseCpuMove({
      board: this.board,
      cpuMark: "×",
      playerMark: "◯",
      turnNumber: this.turnNumber,
      allowOuter,
    });

    const isOuter = isOuterCell(cpuIdx);

    // “初めて外側に置く” かつ 7/8手目 のときだけ 1秒待つ（演出）
    const shouldRevealDelay =
      !this.hasRevealedOuterMove &&
      isOuter &&
      OUTER_REVEAL_TURN_NUMBERS.has(this.turnNumber);

    const delay = shouldRevealDelay ? OUTER_REVEAL_DELAY_MS : 300;

    if (shouldRevealDelay) {
      this.hasRevealedOuterMove = true;
      this.statusText.setText("CPU ……");
    } else {
      this.statusText.setText("CPU 思考中…");
    }

    this.time.delayedCall(delay, () => {
      if (this.gameOver) return;
      if (this.board[cpuIdx] !== null) return;

      // ★ ここが要件の本体：
      // CPUが「9手目以降」に「外側」に置く時だけ、
      // 先に格子線を浮き出させてから置く（初回だけ）
      const shouldRevealBeforePlace =
        isOuterCell(cpuIdx) && this.turnNumber >= 9 && !this.isOuterGridRevealed;

      const placeThenContinue = () => {
        this.placeMark(cpuIdx, "×");

        const res2 = evaluateBoard(this.board);
        if (res2.done) {
          this.finish(res2);
          return;
        }

        // プレイヤーターンへ
        this.turn = "◯";
        this.turnNumber += 1;
        this.updateStatusText();
      };

      if (shouldRevealBeforePlace) {
        this.statusText.setText("CPU ……");
this.revealOuterGrid(() => {
  // ★ 格子が出てから一呼吸おく
  this.time.delayedCall(220, () => {
    if (this.gameOver) return;
    placeThenContinue();
  });
});

      } else {
        placeThenContinue();
      }
    });
  }

  private placeMark(idx: number, mark: Mark) {
    this.board[idx] = mark;
    const image = this.cellImages[idx];

    if (mark === "×") image.setTexture("ghost");
    if (mark === "◯") image.setTexture("barnacle");

    const baseScale = TARGET_HEIGHT / image.height;

    // 下から生えるための基準（足元固定）
    image.setOrigin(0.5, 0.8);

    // いったん表示位置に置いたまま、縦を0にして隠す
    image.setVisible(true);
    image.setScale(baseScale, 0.3);

    // すでに同じセルでtweenが走ってたら止める（連打対策）
    this.tweens.killTweensOf(image);

    // 下から「にょきっ」
    this.tweens.add({
      targets: image,
      scaleY: baseScale,
      duration: 140,
      alpha: 1,
      ease: "Back.Out",
    });
  }

  private finish(res: ReturnType<typeof evaluateBoard>) {
    this.gameOver = true;

    if (res.winner === "×") {
      this.statusText.setText("CPU wins!");
    } else if (res.winner === "◯") {
      this.statusText.setText("You win!");
    } else {
      this.statusText.setText("Draw!");
    }

    // 勝ちラインをハイライト
    if (res.done && res.winner) {
      for (let i = 0; i < this.cellImages.length; i++) {
        const img = this.cellImages[i];
        const mark = this.board[i];

        // 空のセルは変更しない
        if (mark === null) continue;

        const isWinnerMark = mark === res.winner;
        const isWinLine = !!res.line?.includes(i);

        if (isWinnerMark) {
          img.setTexture(
            isWinLine
              ? mark === "◯"
                ? "barnacle_bite"
                : "ghost_normal"
              : mark === "◯"
              ? "barnacle_bite"
              : "ghost_normal"
          );
        } else {
          img.setTexture(mark === "◯" ? "barnacle_dead" : "ghost_dead");
        }

        // スケールを保持
        const baseScale = TARGET_HEIGHT / img.height;
        img.setScale(baseScale);

        // ★ 勝ちラインだけ sparkle を重ねる
        if (isWinLine) {
          const sparkle = this.add
            .image(img.x, img.y, "sparkle")
            .setOrigin(0.5)
            .setDepth(img.depth + 1)
            .setScale(0.03)
            .setAlpha(0.8);

          this.tweens.add({
            targets: sparkle,
            alpha: { from: 0.2, to: 1 },
            scale: { from: 0.2, to: 0.4 },
            duration: 200,
            repeat: 1,
            ease: "Sine.Out",
            onComplete: () => sparkle.destroy(),
          });
        }
      }
    }
  }

  private resetGame() {
    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

    // ★ 外側グリッドの演出状態もリセット
    this.isOuterGridRevealed = false;
    if (this.outerGridOverlay) {
      this.outerGridOverlay.setVisible(false);
      this.outerGridOverlay.setAlpha(0);
      this.outerGridOverlay.setScale(1);
    }

    for (let i = 0; i < this.cellImages.length; i++) {
      const image = this.cellImages[i];
      image.setVisible(false);
    }
    this.updateStatusText();
  }

  private updateStatusText() {
    if (this.gameOver) return;

    if (this.turn === "◯") {
      this.statusText.setText(`Your turn（${this.turnNumber}step）`);
    } else {
      this.statusText.setText(`CPU's turn（${this.turnNumber}step）`);
    }
  }

  // ====== 追加したヘルパー群 ======

  // 外周の太枠は描かず、「5×5の内側線だけ」オーバーレイに描く
private drawOuterGridOverlay() {
  this.outerGridOverlay.clear();

  // オーバーレイの線（色は白のまま。背景に合わせて好みで）
  this.outerGridOverlay.lineStyle(4, 0xffffff, 1);

  // ★ 5×5 外枠（これを追加）
  this.outerGridOverlay.strokeRect(PADDING_LEFT, PADDING_TOP, BOARD_PX, BOARD_PX);

  // 縦線（内側：1〜BOARD_SIZE-1）
  for (let i = 1; i < BOARD_SIZE; i++) {
    const x = PADDING_LEFT + i * CELL_SIZE;
    this.outerGridOverlay.beginPath();
    this.outerGridOverlay.moveTo(x, PADDING_TOP);
    this.outerGridOverlay.lineTo(x, PADDING_TOP + BOARD_PX);
    this.outerGridOverlay.strokePath();
  }

  // 横線（内側：1〜BOARD_SIZE-1）
  for (let i = 1; i < BOARD_SIZE; i++) {
    const y = PADDING_TOP + i * CELL_SIZE;
    this.outerGridOverlay.beginPath();
    this.outerGridOverlay.moveTo(PADDING_LEFT, y);
    this.outerGridOverlay.lineTo(PADDING_LEFT + BOARD_PX, y);
    this.outerGridOverlay.strokePath();
  }
}

  // “ふわっと浮き出る”演出（終わったら次の処理へ）
  private revealOuterGrid(onComplete?: () => void) {
    if (this.isOuterGridRevealed) {
      onComplete?.();
      return;
    }
    this.isOuterGridRevealed = true;

    this.outerGridOverlay.setVisible(true);
    this.outerGridOverlay.setAlpha(0);
    this.outerGridOverlay.setScale(0.995);

    this.tweens.add({
      targets: this.outerGridOverlay,
      alpha: { from: 0, to: 0.55 },
      scale: { from: 0.995, to: 1.0 },
      duration: 420,
      ease: "Sine.Out",
      onComplete: () => onComplete?.(),
    });
  }
}
