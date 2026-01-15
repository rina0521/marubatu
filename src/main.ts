// src/main.ts

import Phaser from "phaser";
import "./style.css";
import { WIDTH, HEIGHT } from "./game/constants";

import { TicTacToeScene } from "./scenes/TicTacToeScene";

new Phaser.Game({
  type: Phaser.AUTO,
  scale:{
    mode: Phaser.Scale.FIT,
    width: WIDTH,
    height: HEIGHT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  parent: "app",
  scene: [TicTacToeScene],
});
