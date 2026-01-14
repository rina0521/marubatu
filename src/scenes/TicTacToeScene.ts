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
    this.cellImages = [];
    for (let idx = 0; idx < this.board.length; idx++) {
      const { x, y } = cellCenter(idx);


      const image = this.add
        .image(x, y, "barnacle")
        .setVisible(false)
        .setOrigin(0.5)
      
      // 外側は“見えにくい世界”にしたいので、印も少し薄め
      if (isOuterCell(idx)) image.setAlpha(0.7);

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

  private placeMark(idx: number, mark: Mark) {
    this.board[idx] = mark;
    const image = this.cellImages[idx];

    if (mark === "×") image.setTexture("ghost");
    if (mark === "◯") image.setTexture("barnacle");
    const baseScale = TARGET_HEIGHT / image.height;
    image.setScale(baseScale);
    image.setVisible(true);
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
        const img = this.cellImages[i]
        if (res.line?.includes(i)) {
          img.setTexture(res.winner ===
            "◯" ? "barnacle_bite" : "ghost_normal"
          )
        }else{
          img.setTexture(res.winner === "◯" ? "ghost_dead" : "barnacle_dead")  
        }
      }
    }

    this.hintText.setText("Restart");
  }

  private resetGame() {
    this.board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
    this.turn = "◯";
    this.gameOver = false;
    this.turnNumber = 1;
    this.hasRevealedOuterMove = false;

    for (let i = 0; i < this.cellImages.length; i++) {
      const image = this.cellImages[i];
      image.setVisible(false);
      // 外側は薄いまま
      //image.setAlpha(isOuterCell(i) ? 0.7 : 1);
    }
    //this.cellImages.forEach(image => image.setScale(1));
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
