import "./style.css";
import { Game } from "./game.js";

const game = new Game({
  video: document.getElementById("cameraVideo"),
  backgroundCanvas: document.getElementById("backgroundCanvas"),
  cameraCanvas: document.getElementById("cameraCanvas"),
  gameCanvas: document.getElementById("gameCanvas"),
  effectsCanvas: document.getElementById("effectsCanvas"),
  hud: document.getElementById("hud"),
  overlay: document.getElementById("overlay"),
});

game.start();
