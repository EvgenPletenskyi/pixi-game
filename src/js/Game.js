const {Container, Sprite, Texture, Graphics} = PIXI;
import {Block} from './Block.js';
import {level_1} from '../levels/level_1.js';
import {spriteMap} from '../sprites/spriteMap.js';

export default class Game {
    constructor(app) {
        this.app = app;
        this.levels = [level_1];
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
        this.previousDraggedBlock = new PIXI.Point();
        this.directionX = 0;
        this.directionY = 0;
        this.previousRow = null;
        this.previousCol = null;
        this.previousMouse = new PIXI.Point();
        this.previousDirectionY = null;
        this.row = 0;
        this.col = 0;
        this.isUpdating = false;


        // Запускаємо ап тікер
        this.app.ticker.add(this.update.bind(this));
    }

    createMatrix() {
        return [
            [0, 1, 0, 0, 0, 0, 0, 1, 0],
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [0, 1, 0, 0, 0, 0, 0, 1, 0]
        ];
    }

    init() {
        this.createBackground();
        this.drawCells();
        this.populateLevel(this.currentLevel);

        this.app.stage.interactive = true;

        this.app.stage.on('pointerup', () => {
            this.dragging = false;
            this.dragAxis = null;
            this.alignRectToGrid();
        });

        this.app.stage.on('pointerupoutside', () => {
            this.dragging = false;
            this.dragAxis = null;
        });

        this.app.stage.on('pointermove', (event) => {
            if (!this.dragging) return;
            this.isUpdating = true;

            const globalPosition = event.data.global;


            this.mouse.copyFrom(this.cellContainer.toLocal(globalPosition));

            this.directionX = (this.mouse.x - this.previousMouse.x >= 0) ? 1 : -1;
            this.directionY = (this.mouse.y - this.previousMouse.y >= 0) ? 1 : -1;

            this.previousMouse.copyFrom(this.mouse);

            let row;
            let col;
            if (this.directionX > 0) {
                col = Math.floor(this.draggedBlock.x / this.cellSize);
            } else {
                col = Math.ceil(this.draggedBlock.x / this.cellSize);
            }

            if (this.directionY > 0) {
                row = Math.floor(this.draggedBlock.y / this.cellSize);
            } else {
                row = Math.ceil(this.draggedBlock.y / this.cellSize);
            }

            if (this.previousCol !== col && this.previousCol) {
                console.log('ppppppppp')
                if (this.gameMatrix[row][col + this.directionX] === 1) {
                    this.dragAxis = 'x';
                } else {
                    this.dragAxis = 'y';
                }
            }else if (this.previousRow !== row && this.previousRow) {
                console.log('qqqqqqqqq')
                if (this.gameMatrix[row + this.directionY][col] === 1) {
                    this.dragAxis = 'y';
                }else {
                    this.dragAxis = 'x';
                }
            }

            if (!this.dragAxis || this.almostCenter()) {
                this.isUpdating = true;
                this.alignRectToGrid();

                this.previousRow = row;
                this.previousCol = col;

                let delta = this.newMousePosition.subtract(this.draggedBlock);

                if (Math.abs(delta.x) - Math.abs(delta.y) > 5) {
                    console.log('dddd')
                    if (this.gameMatrix[row][col + this.directionX] === 1) {
                        this.dragAxis = 'x';
                    } else {
                        this.dragAxis = 'y';
                    }
                } else if (Math.abs(delta.y) - Math.abs(delta.x) > 5) {
                    console.log(']]]]]]]]]]]')
                    if (this.gameMatrix[row + this.directionY][col] === 1) {
                        this.dragAxis = 'y';
                    }else {
                        this.dragAxis = 'x';
                    }
                }
            }
            this.isUpdating = false;
        });
    }

    update(delta) {
        if (this.dragging && !this.isUpdating) {
            this.isUpdating = true;
            this.newMousePosition = this.mouse.subtract(this.draggedBlockOffset);
            const distanceX = Math.abs(this.newMousePosition.x - this.draggedBlock.x);
            const distanceY = Math.abs(this.newMousePosition.y - this.draggedBlock.y);
            const speed = 10;
            const offset = 5; // Порогове значення для автоматичного вирівнювання

            if (this.dragAxis === 'x') {
                if (distanceX > this.cellSize / 2) {
                    this.draggedBlock.x += speed * Math.sign(this.newMousePosition.x - this.draggedBlock.x);
                } else {
                    this.draggedBlock.x = this.newMousePosition.x;
                }
            } else if (this.dragAxis === 'y') {
                if (distanceY > this.cellSize / 2) {
                    this.draggedBlock.y += speed * Math.sign(this.newMousePosition.y - this.draggedBlock.y);
                } else {
                    this.draggedBlock.y = this.newMousePosition.y;
                }
            }

            // // Автоматичне вирівнювання блоку в межах +- 10 пікселів від центру клітинки
            // const nearestGridX = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
            // const nearestGridY = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;
            //
            // if (Math.abs(this.draggedBlock.x - nearestGridX) < offset) {
            //     this.draggedBlock.x = nearestGridX;
            // }
            // if (Math.abs(this.draggedBlock.y - nearestGridY) < offset) {
            //     this.draggedBlock.y = nearestGridY;
            // }
            // if  (this.draggedBlock.y % this.cellSize ===0) {
            //     this.previousDraggedBlock.copyFrom(this.draggedBlock);
            // }
            // if  (this.draggedBlock.x % this.cellSize === 0) {
            //     this.previousDraggedBlock.copyFrom(this.draggedBlock);
            // }
            this.isUpdating = false;
        }
    }


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

        const globalPosition = event.data.global;

        this.startPosition.copyFrom(this.cellContainer.toLocal(event.data.global));
        this.draggedBlockOffset = this.startPosition.subtract(target.position);

        this.previousDraggedBlock.copyFrom(this.draggedBlock.position);
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
}
