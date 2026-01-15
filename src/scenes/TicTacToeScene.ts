// src/scenes/TicTacToeScene.ts

import Phaser from "phaser";
import {
  BOARD_SIZE,
  COLORS,
  OUTER_REVEAL_DELAY_MS,
  OUTER_REVEAL_TURN_NUMBERS,
  type Cell,
  type Mark,
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

  outerFrame!: Phaser.GameObjects.Graphics;

  outerGridOverlay!: Phaser.GameObjects.Graphics;
  isOuterGridRevealed = false;


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
    this.load.image("ghost","/marubatu/assets/ghost.png");
    this.load.image("ghost_normal","/marubatu/assets/ghost_normal.png");
    this.load.image("ghost_dead","/marubatu/assets/ghost_dead.png");
    this.load.image("title", "/marubatu/assets/title.png");
    this.load.image("restart_button", "/marubatu/assets/restart.png");
    this.load.image("sparkle", "/marubatu/assets/sparkle.png");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // 盤面グリッド（5×5薄く + 中央3×3強調）
    drawBoardGrid(this, {
      // 外側はかなり薄く：あとで目視で調整しやすい
      weakAlpha: 0.12,
      weakLineWidth: 2,
    });
  
    // 盤面グリッド（5×5薄く + 中央3×3強調）
    drawBoardGrid(this, { weakAlpha: 0.12, weakLineWidth: 2 });
    // ★ 5×5のセル境界を“後から浮き出させる”ためのオーバーレイ
    this.outerGridOverlay = this.add.graphics();
    this.outerGridOverlay.setDepth(10);      // 盤面より上（必要なら調整）
    this.outerGridOverlay.setAlpha(0);
    this.outerGridOverlay.setVisible(false);

    this.drawOuterGridOverlay(); // 線を描いておく（透明なだけ）


    // ★ 5×5外枠の“浮き出し用オーバーレイ”を作って隠す
    this.outerFrame = this.add.graphics();
    this.outerFrame.setDepth(10);      // 盤面より上（UIより下にしたいなら調整）
    this.outerFrame.setAlpha(0);       // 最初は見えない
    this.outerFrame.setVisible(false); // 無駄描画を避けたいなら

    // 外枠の矩形を描く（位置は board のセル中心計算に合わせる）
    this.drawOuterFrame();
  

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


      const image = this.add
        .image(x, y, "barnacle")
        .setVisible(false)
        .setOrigin(0.5)
      
      // 外側は“見えにくい世界”にしたいので、印も少し薄め
      //if (isOuterCell(idx)) image.setAlpha(0.7);

      this.cellImages.push(image);      

      // クリック領域（透明）
      const r = this.add
        .rectangle(x, y, 120, 120, 0x000000, 0) // サイズは見た目より少し大きくてもOK
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

    this.placeMark(idx, "◯");

    const res = evaluateBoard(this.board);
    if (res.done) {
      this.finish(res);
      return;
    }

    // CPUターンへ
    this.turn = "×";
    this.turnNumber += 1;
    this.updateStatusText();

    this.runCpuTurn();
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

      // 念のため空きを確認（まれに状態が変わることはない設計だが安全策）
      if (this.board[cpuIdx] !== null) return;

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
    });
  }

private drawOuterGridOverlay() {
  const CELL = 120;
  const N = BOARD_SIZE; // 5

  const tl = cellCenter(0);
  const br = cellCenter(N * N - 1);

  const left = tl.x - CELL / 2;
  const top = tl.y - CELL / 2;
  const right = br.x + CELL / 2;
  const bottom = br.y + CELL / 2;

  this.outerGridOverlay.clear();

  // 線の見た目（外周が無いので少し太めでもOK）
  this.outerGridOverlay.lineStyle(4, 0xffffff, 1);

  // 縦線：内側だけ（1〜N-1）
  for (let i = 1; i < N; i++) {
    const x = left + i * CELL;
    this.outerGridOverlay.beginPath();
    this.outerGridOverlay.moveTo(x, top);
    this.outerGridOverlay.lineTo(x, bottom);
    this.outerGridOverlay.strokePath();
  }

  // 横線：内側だけ（1〜N-1）
  for (let i = 1; i < N; i++) {
    const y = top + i * CELL;
    this.outerGridOverlay.beginPath();
    this.outerGridOverlay.moveTo(left, y);
    this.outerGridOverlay.lineTo(right, y);
    this.outerGridOverlay.strokePath();
  }
}

private revealOuterGrid() {
  if (this.isOuterGridRevealed) return;
  this.isOuterGridRevealed = true;

  this.outerGridOverlay.setVisible(true);
  this.outerGridOverlay.setAlpha(0);
  this.outerGridOverlay.setScale(0.995);

  this.tweens.add({
    targets: this.outerGridOverlay,
    alpha: { from: 0, to: 0.55 }, // 最終の濃さ。好みで
    scale: { from: 0.995, to: 1.0 },
    duration: 420,
    ease: "Sine.Out",
  });
}


  private placeMark(idx: number, mark: Mark) {
  if (isOuterCell(idx)) {
  this.revealOuterGrid();
}

    // 外側に置かれたら、5×5外枠をふわっと出す（最初の1回だけ）
    if (isOuterCell(idx)) {
      this.revealOuterFrame();
    }

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
      ease: "Back.Out", // ちょい弾む。嫌なら "Cubic.Out" とか
    });
  }

private drawOuterFrame() {
  // あなたのクリック領域が 120×120 なので、セルサイズは 120 とみなす
  // ※もし drawBoardGrid が別サイズならここを合わせる必要あり（後述）
  const CELL = 120;

  // cellCenter(0) が 5×5の左上セル中心、cellCenter(24) が右下セル中心という前提
  const tl = cellCenter(0);
  const br = cellCenter(24);

  // 外枠の内側がセル境界に来るよう、中心から半セルずつ広げる
  const left = tl.x - CELL / 2;
  const top = tl.y - CELL / 2;
  const width = (br.x - tl.x) + CELL;
  const height = (br.y - tl.y) + CELL;

  this.outerFrame.clear();

  // “ふわっと”用なので少し太め・薄めから始める
  this.outerFrame.lineStyle(6, 0xffffff, 1); // 色は白。背景に合わせて調整OK
  this.outerFrame.strokeRoundedRect(left, top, width, height, 12);
}

private isOuterFrameRevealed = false; // 追加プロパティ（クラスに）

private revealOuterFrame() {
  if (this.isOuterFrameRevealed) return;
  this.isOuterFrameRevealed = true;

  this.outerFrame.setVisible(true);
  this.outerFrame.setAlpha(0);

  // ふわっと：フェードイン＋少しだけスケール（気配）
  this.outerFrame.setScale(0.98);

  this.tweens.add({
    targets: this.outerFrame,
    alpha: { from: 0, to: 0.9 },
    scale: { from: 0.98, to: 1.0 },
    duration: 420,
    ease: "Sine.Out",
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

    const isWinnerMark = mark === res.winner;      // そのセルの印が勝者側か
    const isWinLine = !!res.line?.includes(i);     // 勝ちライン上か（キラキラ用）

    if (isWinnerMark) {
      img.setTexture(
        isWinLine
          ? (mark === "◯" ? "barnacle_bite" : "ghost_normal")
          : (mark === "◯" ? "barnacle_bite" : "ghost_normal")
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
    this.isOuterFrameRevealed = false;
if (this.outerFrame) {
  this.outerFrame.setVisible(false);
  this.outerFrame.setAlpha(0);
  this.outerFrame.setScale(1);
}
this.isOuterGridRevealed = false;
if (this.outerGridOverlay) {
  this.outerGridOverlay.setVisible(false);
  this.outerGridOverlay.setAlpha(0);
  this.outerGridOverlay.setScale(1);
}

    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

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
}
