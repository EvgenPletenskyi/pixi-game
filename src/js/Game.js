const {Container, Sprite, Texture, Graphics, TextStyle, Text} = PIXI;
import {Block} from './Block.js';
import {Popup} from './Popup.js';
import {level_1} from '../levels/level_1.js';
import {level_2} from '../levels/level_2.js';
import {level_3} from '../levels/level_3.js';
import {spriteMap} from '../sprites/spriteMap.js';

export default class Game {
    constructor(app) {
        this.app = app;
        this.levels = [level_1, level_2, level_3];
        this.initialStates = this.levels.map(level => level.map(row => [...row]));
        this.currentLevel = 0;
        this.container = new Container();
        this.cellContainer = new Container();
        this.app.stage.addChild(this.container);
        this.cellSize = 70;
        this.dragging = false;
        this.dragAxis = null;
        this.mouse = new PIXI.Point();
        this.startPosition = new PIXI.Point();
        this.draggedBlockOffset = new PIXI.Point();
        this.newMousePosition = new PIXI.Point();
        this.popup = null;
        this.levelCompleted = false

        this.gameMatrix = this.createMatrix();
        this.app.ticker.add(this.update.bind(this));

        this.init();
    }

    createMatrix() {
        return this.initialStates[this.currentLevel].map(row => [...row]);
    }


    init() {
        this.createBackground();
        this.drawCells();
        this.populateLevel(this.currentLevel);
        this.initTimer();
        this.startTimer();

        this.app.stage.interactive = true;

        this.app.stage.on('pointerup', event => this.onPointerUp(event));
        this.app.stage.on('pointermove', event => this.onPointerMove(event));
        this.app.stage.on('pointerupoutside', () => {
            this.dragging = false;
            this.dragAxis = null;
        });
    }

    initTimer() {
        this.timerDuration = 60;
        this.remainingTime = this.timerDuration;
        this.timerText = new Text('', new TextStyle({fontSize: 24, fill: '#ffffff'}));
        this.timerText.x = this.app.screen.width - 100;
        this.timerText.y = 10;
        this.container.addChild(this.timerText);
        this.remainingTime = this.timerDuration;
        this.timerText.text = `Time: ${this.remainingTime}`;
        this.timesOut = false;
    }

    startTimer() {
        this.remainingTime = this.timerDuration;
        this.timerText.text = `Time: ${this.remainingTime}`;
    }

    onPointerUp(event) {
        this.dragging = false;
        this.dragAxis = null;
        this.alignRectToGrid();

        if (this.draggedBlock) {
            let col = Math.floor(this.draggedBlock.x / this.cellSize);
            let row = Math.floor(this.draggedBlock.y / this.cellSize);
            if (this.draggedBlock.block.row !== row || this.draggedBlock.block.col !== col) {
                this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                this.gameMatrix[row][col] = this.draggedBlock.block.id;

                this.draggedBlock.block.row = row;
                this.draggedBlock.block.col = col;
            }
        }

        if (this.checkAllBlocksInPlace()) {
            this.levelCompleted = true;
            this.createPopup("Level Complete!", () => {
                    this.loadPrevLevel();
                }, () => {
                    this.loadNextLevel();
                }, () => {
                    window.close();
                },
                () => {
                    this.retryLevel();
                },
                this.currentLevel, this.levels, this.timesOut);
        }
    }

    onPointerMove(event) {
        if (!this.dragging) return;

        const globalPosition = event.data.global;


        this.mouse.copyFrom(this.cellContainer.toLocal(globalPosition));

        if (!this.dragAxis || this.almostCenter()) {
            this.alignRectToGrid();

            let delta = this.newMousePosition.subtract(this.draggedBlock);

            if (Math.abs(delta.x) - Math.abs(delta.y) > 5) {
                this.dragAxis = 'x';
            } else if (Math.abs(delta.y) - Math.abs(delta.x) > 5) {
                this.dragAxis = 'y';
            }
        }
    }

    update(delta) {
        if (this.levelCompleted) return;

        this.remainingTime -= delta / 60; // Припускаємо, що 60 кадрів в секунду
        this.timerText.text = `Time: ${Math.max(0, Math.floor(this.remainingTime))}`; // Оновлюємо текст таймера

        if (this.remainingTime <= 0 && !this.timesOut) {
            this.timesOut = true;
            this.remainingTime = 0; // Скидання залишку часу
            this.createPopup("You didn’t fail.\n You just discovered what not to do.",
                () => {
                    this.loadPrevLevel();
                }, () => {
                    this.loadNextLevel();
                }, () => {
                    window.close();
                }, () => {
                    this.retryLevel()
                }, this.currentLevel, this.levels, this.timesOut);
        }

        if (this.dragging) {
            this.newMousePosition = this.mouse.subtract(this.draggedBlockOffset);

            const distance = this.newMousePosition.subtract(this.draggedBlock);
            const speed = 24;
            const offset = 10; // Threshold value for automatic alignment
            let col = Math.floor(this.draggedBlock.x / this.cellSize);
            let row = Math.floor(this.draggedBlock.y / this.cellSize);

            // Check if the block has reached a new cell
            if (this.draggedBlock.x % this.cellSize === 0 || this.draggedBlock.y % this.cellSize === 0) {

                // Update columns if a block reaches a new cell
                if (this.draggedBlock.x % this.cellSize === 0) {
                    col = this.draggedBlock.x / this.cellSize;
                    this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                    this.gameMatrix[this.draggedBlock.block.row][col] = this.draggedBlock.block.id;
                    this.draggedBlock.block.col = col;
                }
                //Update rows if a block reaches a new cell
                if (this.draggedBlock.y % this.cellSize === 0) {
                    row = this.draggedBlock.y / this.cellSize;
                    this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                    this.gameMatrix[row][this.draggedBlock.block.col] = this.draggedBlock.block.id;
                    this.draggedBlock.block.row = row;
                }
            }

            let nextCol = (this.newMousePosition.x > this.draggedBlock.x) ? col + 1 : (this.newMousePosition.x < this.draggedBlock.x) ? Math.ceil(this.draggedBlock.x / this.cellSize) - 1 : col;
            let nextRow = (this.newMousePosition.y > this.draggedBlock.y) ? row + 1 : (this.newMousePosition.y < this.draggedBlock.y) ? Math.ceil(this.draggedBlock.y / this.cellSize) - 1 : row;

            if (nextRow < 0 || nextRow >= this.gameMatrix.length) {
                return;
            }

            if (this.dragAxis === 'x') {
                if (nextCol > this.gameMatrix[0].length - 1) {
                    this.draggedBlock.x = (this.gameMatrix[0].length - 1) * this.cellSize
                }
                if (nextCol < 0) {
                    this.draggedBlock.x = this.cellSize;
                }
                if (this.gameMatrix[row][nextCol] !== 1) {
                    this.draggedBlock.x = this.draggedBlock.block.col * this.cellSize
                }
                if (this.gameMatrix[row][nextCol] !== 1 && nextCol !== this.draggedBlock.block.col) {
                    this.newMousePosition.x = this.draggedBlock.x;
                    return;
                } else if (Math.abs(distance.x) > this.cellSize / 2) {
                    this.draggedBlock.x += speed * Math.sign(this.newMousePosition.x - this.draggedBlock.x);
                } else {
                    this.draggedBlock.x = Math.round(this.newMousePosition.x / 2) * 2;
                }
            } else if (this.dragAxis === 'y') {
                if (nextRow > this.gameMatrix.length - 1) {
                    this.draggedBlock.y = (this.gameMatrix.length - 1) * this.cellSize;
                }
                if (nextRow < 0) {
                    this.draggedBlock.y = this.cellSize;
                }
                if (!this.isWinnerCell(nextRow, col, this.draggedBlock.block.id) && this.gameMatrix[nextRow][col] !== 1) {
                    this.draggedBlock.y = this.draggedBlock.block.row * this.cellSize
                }
                if (!this.isWinnerCell(nextRow, col, this.draggedBlock.block.id) && this.gameMatrix[nextRow][col] !== 1 && nextRow !== this.draggedBlock.block.row) {
                    this.newMousePosition.y = this.draggedBlock.y;
                    return;
                } else if (Math.abs(distance.y) > this.cellSize / 2) {
                    this.draggedBlock.y += speed * Math.sign(this.newMousePosition.y - this.draggedBlock.y);
                } else {
                    this.draggedBlock.y = this.newMousePosition.y;
                }
            }

            const nearestGridX = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
            const nearestGridY = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;

            if (Math.abs(this.draggedBlock.x - nearestGridX) < offset) {
                this.draggedBlock.x = nearestGridX;
            }
            if (Math.abs(this.draggedBlock.y - nearestGridY) < offset) {
                this.draggedBlock.y = nearestGridY;
            }
        }
    }

    isWinnerCell(row, col, blockId) {
        if (this.gameMatrix[row][col] === '*') {
            if ((row === 0 && col === 1 && blockId === 4) ||
                (row === 0 && col === 7 && blockId === 5) ||
                (row === 7 && col === 1 && blockId === 6) ||
                (row === 7 && col === 7 && blockId === 7)) {
                return true;
            }
            return false;
        }
    };

    createBackground() {
        const backgroundTexture = Texture.from(spriteMap.background.sprite);
        const background = new Sprite(backgroundTexture);
        background.width = this.app.screen.width;
        background.height = this.app.screen.height;
        this.container.addChild(background);
    }

    drawCells() {
        this.gameMatrix.forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
                if (cellValue === 1) {
                    const cell = new Graphics();
                    cell.drawRect(
                        colIndex * this.cellSize,
                        rowIndex * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                    cell.endFill();
                    this.cellContainer.addChild(cell);
                }
            });
        });
        this.cellContainer.x = 197;
        this.cellContainer.y = 103.5;
        this.container.addChild(this.cellContainer);
    }

    populateLevel(levelIndex) {
        const level = this.levels[levelIndex];
        if (!level) return;
        level.forEach((row, rowIndex) => {
            row.forEach((col, colIndex) => {
                if (col !== 0 && col !== '*' && col !== 1) {
                    const spriteEntry = Object.values(spriteMap).find(item => item.id === col);
                    if (spriteEntry) {
                        const {id, sprite} = spriteEntry;
                        const texture = Texture.from(sprite);
                        const gameSprite = new Sprite(texture);
                        const block = new Block(id);
                        gameSprite.block = block;
                        if (block.isMovable) {
                            gameSprite.interactive = true;
                            gameSprite.buttonMode = true;
                            gameSprite.on('pointerdown', this.onBlockGrab.bind(this)).on('pointerout', () => {
                            });
                        }
                        gameSprite.x = colIndex * this.cellSize;
                        gameSprite.y = rowIndex * this.cellSize;
                        this.cellContainer.addChild(gameSprite);
                        this.gameMatrix[rowIndex][colIndex] = block.id;
                    }
                }
            });
        });
    }


    onBlockGrab(event) {
        const target = event.currentTarget;
        this.draggedBlock = target;
        this.dragging = true;

        let col = Math.floor(this.draggedBlock.x / this.cellSize);
        let row = Math.floor(this.draggedBlock.y / this.cellSize);

        this.draggedBlock.block.col = col;
        this.draggedBlock.block.row = row;

        this.startPosition.copyFrom(this.cellContainer.toLocal(event.data.global));
        this.draggedBlockOffset = this.startPosition.subtract(target.position);

    }

    alignRectToGrid() {
        // Check if draggedBlock is defined
        if (this.draggedBlock) {
            this.draggedBlock.x = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
            this.draggedBlock.y = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;
        }
    }
    almostCenter() {
        const offset = 10;
        if (this.dragAxis === 'x') {
            return Math.abs(this.draggedBlock.x) % this.cellSize < offset;
        } else if (this.dragAxis === 'y') {
            return Math.abs(this.draggedBlock.y) % this.cellSize < offset;
        }
        return false;
    }

    checkAllBlocksInPlace() {
        const requiredPositions = [
            {row: 0, col: 1, blockId: 4},
            {row: 0, col: 7, blockId: 5},
            {row: 7, col: 1, blockId: 6},
            {row: 7, col: 7, blockId: 7}
        ];

        for (const {row, col, blockId} of requiredPositions) {
            if (this.gameMatrix[row][col] !== blockId) {
                return false;
            }
        }
        return true;
    }

    clearCurrentLevel() {
        this.container.removeChild(this.popup.getPopupContainer());
        this.cellContainer.removeChildren();
        this.gameMatrix = this.createMatrix();
        this.timesOut = false;
        this.levelCompleted = false;
    }

    loadNextLevel() {
        this.clearCurrentLevel();
        this.currentLevel++;

        if (this.currentLevel < this.levels.length) {
            this.gameMatrix = this.createMatrix();
            this.populateLevel(this.currentLevel);
        }
        this.startTimer();
    }

    loadPrevLevel() {
        this.clearCurrentLevel();
        this.currentLevel--;

        if (this.currentLevel < this.levels.length) {
            this.gameMatrix = this.createMatrix();
            this.populateLevel(this.currentLevel);
        }
        this.startTimer();
    }

    retryLevel() {
        this.clearCurrentLevel();
        this.populateLevel(this.currentLevel);
        this.startTimer();
    }

    createPopup(message, onPrevLevel, onNextLevel, onClose, onRetry, currentLevel, levels, timesOut) {
        this.popup = new Popup(message, onPrevLevel, onNextLevel, onClose, onRetry, currentLevel, levels, timesOut);
        this.container.addChild(this.popup.getPopupContainer());
    }
}
