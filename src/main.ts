// src/main.ts

import Phaser from "phaser";

import { TicTacToeScene } from "./scenes/TicTacToeScene";

new Phaser.Game({
  type: Phaser.AUTO,
  scale:{
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [TicTacToeScene],
});
