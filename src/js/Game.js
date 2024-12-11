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
        this.previousRow = null;
        this.previousCol = null;
        this.previousBlockPos = {row: -1, col: -1};

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

            let col = Math.floor(this.draggedBlock.x / this.cellSize);
            let row = Math.floor(this.draggedBlock.y / this.cellSize);
            if (this.draggedBlock.block.row !== row || this.draggedBlock.block.col !== col) { // Оновлюємо матрицю
                this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1; // Стара позиція
                this.gameMatrix[row][col] = this.draggedBlock.block.id; // Нова позиція
                // Оновлюємо позицію блоку
                this.draggedBlock.block.row = row;
                this.draggedBlock.block.col = col;
            }

            console.log(this.gameMatrix)
        });

        this.app.stage.on('pointerupoutside', () => {
            this.dragging = false;
            this.dragAxis = null;
        });

        this.app.stage.on('pointermove', (event) => {
            if (!this.dragging) return;

            const globalPosition = event.data.global;


            this.mouse.copyFrom(this.cellContainer.toLocal(globalPosition));

            if (!this.dragAxis || this.almostCenter()) {
                this.alignRectToGrid();

                let delta = this.newMousePosition.subtract(this.draggedBlock);

                console.log(delta)

                if (Math.abs(delta.x) - Math.abs(delta.y) > 5) {
                    this.dragAxis = 'x';
                } else if (Math.abs(delta.y) - Math.abs(delta.x) > 5) {
                    this.dragAxis = 'y';
                }
            }
        });
    }

    update(delta) {
        if (this.dragging) {
            this.newMousePosition = this.mouse.subtract(this.draggedBlockOffset);
            let distanceX = Math.abs(this.newMousePosition.x - this.draggedBlock.x);
            let distanceY = Math.abs(this.newMousePosition.y - this.draggedBlock.y);

            console.log('distanceY', distanceY)
            const speed = 24;
            const offset = 5; // Порогове значення для автоматичного вирівнювання

            let col = Math.floor(this.draggedBlock.x / this.cellSize);
            let row = Math.floor(this.draggedBlock.y / this.cellSize);

            // Перевіряємо, чи блок досяг нової клітинки
            if (this.draggedBlock.x % this.cellSize === 0 || this.draggedBlock.y % this.cellSize === 0) {
                // Оновлюємо колонки та ряди, якщо блок досяг нової клітинки
                if (this.draggedBlock.x % this.cellSize === 0) {
                    col = this.draggedBlock.x / this.cellSize;
                    this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                    this.gameMatrix[this.draggedBlock.block.row][col] = this.draggedBlock.block.id;
                    this.draggedBlock.block.col = col;
                }
                if (this.draggedBlock.y % this.cellSize === 0) {
                    row = this.draggedBlock.y / this.cellSize;
                    this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                    this.gameMatrix[row][this.draggedBlock.block.col] = this.draggedBlock.block.id;
                    this.draggedBlock.block.row = row;
                }
            }
            let nextCol = (this.newMousePosition.x > this.draggedBlock.x) ? col + 1 : (this.newMousePosition.x < this.draggedBlock.x) ? Math.ceil(this.draggedBlock.x / this.cellSize) - 1 : col;
            let nextRow = (this.newMousePosition.y > this.draggedBlock.y) ? row + 1 : (this.newMousePosition.y < this.draggedBlock.y) ? Math.ceil(this.draggedBlock.y / this.cellSize) - 1 : row;
            if (this.dragAxis === 'x') {
                this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                if (this.gameMatrix[row][nextCol] !== 1) {
                    this.newMousePosition.x = this.draggedBlock.x;
                    return;
                } else if (distanceX > this.cellSize / 2) {
                    this.draggedBlock.x += speed * Math.sign(this.newMousePosition.x - this.draggedBlock.x);
                } else {
                    this.draggedBlock.x = this.newMousePosition.x;
                }
            } else if (this.dragAxis === 'y') {
                this.gameMatrix[this.draggedBlock.block.row][this.draggedBlock.block.col] = 1;
                if (this.gameMatrix[nextRow][col] !== 1) {
                    this.newMousePosition.y = this.draggedBlock.y;
                    return;
                } else if (distanceY > this.cellSize / 2) {
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
}
