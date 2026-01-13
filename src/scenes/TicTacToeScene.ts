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
  cellTexts: Phaser.GameObjects.Text[];
  statusText!: Phaser.GameObjects.Text;
  hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("TicTacToeScene");

    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

    this.cellTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // 盤面グリッド（5×5薄く + 中央3×3強調）
    drawBoardGrid(this, {
      // 外側はかなり薄く：あとで目視で調整しやすい
      weakAlpha: 0.12,
      weakLineWidth: 2,
    });

    // UI
    const ui = createStatusUI(this);
    this.statusText = ui.statusText;
    this.hintText = ui.hintText;

    // リスタートボタン
    createRestartButton(this, () => this.resetGame());

    // 25セル分のテキスト＋クリック領域
    this.cellTexts = [];
    for (let idx = 0; idx < this.board.length; idx++) {
      const { x, y } = cellCenter(idx);

      const t = this.add
        .text(x, y, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "72px",
          color: COLORS.textMain,
        })
        .setOrigin(0.5);

      // 外側は“見えにくい世界”にしたいので、印も少し薄め
      if (isOuterCell(idx)) t.setAlpha(0.7);

      this.cellTexts.push(t);

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
      this.statusText.setText("CPU(O) ……");
    } else {
      this.statusText.setText("CPU(O) 思考中…");
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

  private placeMark(idx: number, mark: Mark) {
    this.board[idx] = mark;
    const t = this.cellTexts[idx];
    t.setText(mark);

    if (mark === "×") t.setColor(COLORS.x);
    if (mark === "◯") t.setColor(COLORS.o);
  }

  private finish(res: ReturnType<typeof evaluateBoard>) {
    this.gameOver = true;

    if (res.winner === "×") {
      this.statusText.setText("CPU(×)の勝ち！");
    } else if (res.winner === "◯") {
      this.statusText.setText("あなた(◯)の勝ち！");
    } else {
      this.statusText.setText("引き分け！");
    }

    // 勝ちラインをハイライト
    if (res.done && res.winner && res.line) {
      for (const idx of res.line) {
        this.cellTexts[idx].setShadow(0, 0, "#ffffff", 14, true, true);
      }
    }

    this.hintText.setText("下のボタンでリスタート");
  }

  private resetGame() {
    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

    for (let i = 0; i < this.cellTexts.length; i++) {
      const t = this.cellTexts[i];
      t.setText("");
      t.setColor(COLORS.textMain);
      t.setShadow(0, 0, "#000000", 0, false, false);
      // 外側は薄いまま
      t.setAlpha(isOuterCell(i) ? 0.7 : 1);
    }

    this.updateStatusText();
  }

  private updateStatusText() {
    if (this.gameOver) return;

    if (this.turn === "◯") {
      this.statusText.setText(`あなた(◯)の番です（${this.turnNumber}手目）`);
    } else {
      this.statusText.setText(`CPU(×)の番です（${this.turnNumber}手目）`);
    }
  }
}
