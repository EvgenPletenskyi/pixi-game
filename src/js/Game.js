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
        this.previousCell = {row: -1, col: -1};
        this.directionX = 0;
        this.directionY = 0;

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
            console.log(this.gameMatrix)
        });

        this.app.stage.on('pointerupoutside', () => {
            this.dragging = false;
            this.dragAxis = null;
        });
        this.mouseDirection = new PIXI.Point();
        this.app.stage.on('pointermove', (event) => {
            if (!this.dragging) return;

            const globalPosition = event.data.global;


            this.mouse.copyFrom(this.cellContainer.toLocal(globalPosition));

            this.directionX = (this.mouse.x - this.startPosition.x >= 0) ? 1 : -1;
            this.directionY = Math.sign(this.mouse.y - this.startPosition.y);

            if (!this.dragAxis || this.almostCenter()) {
                this.checkAlignmentAndSetAxis(this.directionX, this.directionY);
            } else if (this.directionX !== this.directionX || this.directionY !== this.directionY) {
                this.checkAlignmentAndSetAxis(this.directionX, this.directionY);
            }

            // if (!this.dragAxis || this.almostCenter()) {
            //     this.alignRectToGrid();
            //
            //     let delta = this.newMousePosition.subtract(this.draggedBlock);
            //
            //     console.log(this.mouse.x)
            //
            //     console.log(this.mouse.x)
            //
            //     const currentCell = {
            //         row: Math.ceil(this.draggedBlock.y / this.cellSize),
            //         col: Math.ceil(this.draggedBlock.x / this.cellSize)
            //     };
            //     console.log('Direction X:', directionX); // -1 for left, 1 for right
            //     console.log('Direction Y:', directionY);
            //
            //     const nextCol = currentCell.col + Math.sign(this.draggedBlock.x - this.newMousePosition.x);
            //
            //     console.log('log', this.gameMatrix[currentCell.row][Math.ceil((this.draggedBlock.x + directionX * (this.cellSize)) / this.cellSize)])
            //
            //     if (Math.abs(delta.x) - Math.abs(delta.y) > 5) {
            //         if (this.gameMatrix[currentCell.row][Math.floor((this.draggedBlock.x + directionX * (this.cellSize)) / this.cellSize)] === 1) {
            //             this.dragAxis = 'x';
            //         } else {
            //             this.dragAxis = null;
            //             this.dragAxis = 'y';
            //         }
            //
            //     } else if (Math.abs(delta.y) - Math.abs(delta.x) > 5) {
            //         this.dragAxis = 'y';
            //     }
            // }
        });
    }

    checkAlignmentAndSetAxis(directionX, directionY) {
        this.alignRectToGrid();
        let delta = this.newMousePosition.subtract(this.draggedBlock);
        const currentCell = {
            row: Math.ceil(this.draggedBlock.y / this.cellSize),
            col: Math.ceil(this.draggedBlock.x / this.cellSize)
        };
        console.log('Direction X:', directionX);
        console.log('Direction Y:', directionY);
        if (Math.abs(delta.x) - Math.abs(delta.y) > 5) {
            if (this.gameMatrix[currentCell.row][Math.floor((this.draggedBlock.x + directionX * (this.cellSize)) / this.cellSize)] === 1) {
                this.dragAxis = 'x';
            } else {
                this.dragAxis = null;
                this.dragAxis = 'y';
            }
        } else if (Math.abs(delta.y) - Math.abs(delta.x) > 5) {
            this.dragAxis = 'y';
        }
        this.directionX = directionX;
        this.directionY = directionY;
    }

    update(delta) {
        if (this.dragging) {
            this.newMousePosition = this.mouse.subtract(this.draggedBlockOffset);
            const distanceX = Math.abs(this.newMousePosition.x - this.draggedBlock.x);
            const distanceY = Math.abs(this.newMousePosition.y - this.draggedBlock.y);
            const speed = 10;
            const offset = 5; // Порогове значення для автоматичного вирівнювання

            // Зберігаємо попередню клітинку перед вирівнюванням
            const previousCell = {
                row: Math.ceil(this.draggedBlock.y / this.cellSize),
                col: Math.ceil(this.draggedBlock.x / this.cellSize)
            };
            // const nextCol = previousCell.col + this.directionX;

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

            // Автоматичне вирівнювання блоку в межах +- 10 пікселів від центру клітинки
            const nearestGridX = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
            const nearestGridY = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;

            if (Math.abs(this.draggedBlock.x - nearestGridX) < offset) {
                this.draggedBlock.x = nearestGridX;
            }
            if (Math.abs(this.draggedBlock.y - nearestGridY) < offset) {
                this.draggedBlock.y = nearestGridY;
            }

            // Перевіряємо, чи змінилася клітинка після вирівнювання
            const newCell = {
                row: Math.floor(this.draggedBlock.y / this.cellSize),
                col: Math.floor(this.draggedBlock.x / this.cellSize)
            };
            console.log(previousCell.col + this.directionX)
            console.log(newCell)
            console.log(this.directionX)
            // if (previousCell.row + this.directionY == previousCell.row || previousCell.col + this.directionX == previousCell.col) {
            //     console.log(`Block moved to new cell: Row ${newCell.row}, Col ${newCell.col}`);
            //
            //     // Оновлюємо матрицю
            //     this.gameMatrix[previousCell.row][previousCell.col] = 1; // Встановлюємо стару клітинку на 1 (вільна)
            //     this.gameMatrix[newCell.row][newCell.col] = this.draggedBlock.block.id; // Встановлюємо нову клітинку на ID блоку
            //
            //     this.previousCell = newCell; // Оновлюємо попередню клітинку
            // }

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
    }

    alignRectToGrid() {
        this.draggedBlock.x = Math.round(this.draggedBlock.x / this.cellSize) * this.cellSize;
        this.draggedBlock.y = Math.round(this.draggedBlock.y / this.cellSize) * this.cellSize;
    }

    almostCenter() {
        // this.checkAlignmentAndSetAxis(this.directionX, this.directionY);
        const offset = 5;
        if (this.dragAxis === 'x') {
            return Math.abs(this.draggedBlock.x) % this.cellSize < offset;
        } else if (this.dragAxis === 'y') {
            return Math.abs(this.draggedBlock.y) % this.cellSize < offset;
        }
        return false;
    }
}
