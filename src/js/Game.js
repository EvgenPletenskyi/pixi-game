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
        this.gameMatrix = this.createMatrix();
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

        this.app.ticker.add(this.update.bind(this));
    }

    createMatrix() {
        return [
            [0, '*', 0, 0, 0, 0, 0, '*', 0],
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [0, '*', 0, 0, 0, 0, 0, '*', 0]
        ];
    }


    init() {
        this.createBackground();
        this.drawCells();
        this.populateLevel(this.currentLevel);

        this.app.stage.interactive = true;

        this.app.stage.on('pointerup', event => this.onPointerUp(event));
        this.app.stage.on('pointermove', event => this.onPointerMove(event));
        this.app.stage.on('pointerupoutside', () => {
            this.dragging = false;
            this.dragAxis = null;
        });
    }

    onPointerUp(event) {
        this.dragging = false;
        this.dragAxis = null;
        this.alignRectToGrid();

        let col = Math.floor(this.draggedBlock.x / this.cellSize);
        let row = Math.floor(this.draggedBlock.y / this.cellSize);
        if (this.draggedBlock.block.row !== row || this.draggedBlock.block.col !== col) {
            this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
            this.gameMatrix[row][col] = this.draggedBlock.block.id;

            this.draggedBlock.block.row = row;
            this.draggedBlock.block.col = col;
        }

        if (this.checkAllBlocksInPlace()) {
            this.createPopup("Level Complete!", () => {
                this.loadPrevLevel();
            }, () => {
                this.loadNextLevel();
            }, () => {
                window.close();
            }, this.currentLevel, this.levels);
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
        if (this.dragging) {
            this.newMousePosition = this.mouse.subtract(this.draggedBlockOffset);

            const distance = this.newMousePosition.subtract(this.draggedBlock);
            const speed = 24;
            const offset = 5; // Threshold value for automatic alignment
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

        level.forEach(({row, col, type}) => {
            if (this.gameMatrix[row][col] === 1) {
                const {id, sprite} = spriteMap[type];
                const texture = Texture.from(sprite);
                const gameSprite = new Sprite(texture);

                const block = new Block(id);
                gameSprite.block = block;

                if (block.isMovable) {
                    gameSprite.interactive = true;
                    gameSprite.buttonMode = true;
                    gameSprite
                        .on('pointerdown', this.onBlockGrab.bind(this))
                        .on('pointerout', () => {
                        });
                }

                gameSprite.x = col * this.cellSize;
                gameSprite.y = row * this.cellSize;
                this.cellContainer.addChild(gameSprite);
                this.gameMatrix[row][col] = block.id;
            }
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
        this.draggedBlock.x = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
        this.draggedBlock.y = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;
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
    }

    loadNextLevel() {
        this.clearCurrentLevel();
        this.currentLevel++;

        if (this.currentLevel < this.levels.length) {
            this.populateLevel(this.currentLevel);
        } else {
            console.log('Вітаємо! Ви пройшли всі рівні!');
        }
    }

    loadPrevLevel() {
        this.clearCurrentLevel();
        this.currentLevel--;

        if (this.currentLevel < this.levels.length) {
            this.populateLevel(this.currentLevel);
        }
    }

    createPopup(message, onPrevLevel, onNextLevel, onClose, currentLevel, levels) {
        this.popup = new Popup(message, onPrevLevel, onNextLevel, onClose, currentLevel, levels);
        this.container.addChild(this.popup.getPopupContainer());
    }
}
