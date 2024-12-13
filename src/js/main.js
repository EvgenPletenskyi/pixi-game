"use strict";

const { Application } = PIXI;
import Game from './Game.js';

const app = new Application({
    width: 1024,
    height: 768,
});

globalThis.__PIXI_APP__ = app; //FOR DEBUG ONLY

document.getElementById("game-container").appendChild(app.view);


const game = new Game(app);