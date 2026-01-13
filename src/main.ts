import Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#222222",
  scene: {
    create() {
      this.add.text(100, 100, "Hello Phaser!", {
        color: "#ffffff",
        fontSize: "32px",
      });
    },
  },
};

new Phaser.Game(config);
