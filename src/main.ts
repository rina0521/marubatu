// src/main.ts

import Phaser from "phaser";
import { HEIGHT, WIDTH } from "./game/constants";
import { TicTacToeScene } from "./scenes/TicTacToeScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  scene: [TicTacToeScene],
});
