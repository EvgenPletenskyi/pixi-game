const {Container, Sprite, Texture, Graphics} = PIXI;
import {Block} from './Block.js';
import {level_1} from '../levels/level_1.js';
import {level_2} from '../levels/level_2.js';
import {spriteMap} from '../sprites/spriteMap.js';

export default class Game {
    constructor(app) {
        this.app = app;
        this.levels = [level_1, level_2];
        this.gameMatrix = this.createMatrix();
        this.blocks = [];
        this.currentLevel = 0;
        this.mousePosition = {x: 0, y: 0};
        this.container = new Container();
        this.cellContainer = new Container();
        this.app.stage.addChild(this.container);
        this.cellWidth = 70;
        this.cellHeight = 70;
        this.previousCol = null;
        this.previousRow = null;

        this.onPointerUpHandler = this.onBlockDrop.bind(this);
        this.onPointerMoveHandler = this.updateBlockPosition.bind(this);
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

        // Додаємо обробник події pointerdown на app.view
        this.app.stage.on('pointermove', this.onPointerMove.bind(this));
        this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    }

    onPointerMove(event) {
        const localPos = event.data.getLocalPosition(this.cellContainer);
        this.mousePosition = {x: localPos.x, y: localPos.y};
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
                        colIndex * this.cellWidth,
                        rowIndex * this.cellHeight,
                        this.cellWidth,
                        this.cellHeight
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
                this.blocks.push(block);
                gameSprite.block = block;

                // Додаємо координати до блоку
                block.col = col;
                block.row = row;

                if (block.isMovable) {
                    gameSprite.interactive = true;
                    gameSprite.buttonMode = true;
                }

                gameSprite.x = col * this.cellWidth;
                gameSprite.y = row * this.cellHeight;

                this.cellContainer.addChild(gameSprite);

                this.gameMatrix[row][col] = block.id;
            }
        });
    }

    checkPlacementConditions(row, col, blockId) {
        // Перевіряємо умови для кожної конкретної клітинки
        if ((row === 0 && col === 1 && blockId !== 4) ||
            (row === 0 && col === 7 && blockId !== 5) ||
            (row === 7 && col === 1 && blockId !== 6) ||
            (row === 7 && col === 7 && blockId !== 7)) {
            return false; // Не можна поставити блок
        }
        return true; // Блок можна поставити
    }

    checkAllBlocksInPlace() {
        const requiredPositions = [
            { row: 0, col: 1, blockId: 4 },
            { row: 0, col: 7, blockId: 5 },
            { row: 7, col: 1, blockId: 6 },
            { row: 7, col: 7, blockId: 7 }
        ];

        for (const { row, col, blockId } of requiredPositions) {
            if (this.gameMatrix[row][col] !== blockId) {
                return false; // Блок не на своєму місці
            }
        }
        return true; // Усі блоки на своїх місцях
    }

    onPointerDown(event) {
        const localPos = event.data.getLocalPosition(this.cellContainer);
        this.initialMousePosition = {x: localPos.x, y: localPos.y};

        // Отримуємо координати кліка відносно `cellContainer`
        const col = Math.floor(localPos.x / this.cellWidth);
        const row = Math.floor(localPos.y / this.cellHeight);

        // Перевіряємо, чи координати в межах матриці
        if (
            row >= 0 &&
            row < this.gameMatrix.length &&
            col >= 0 &&
            col < this.gameMatrix[0].length
        ) {
            const blockId = this.gameMatrix[row][col];
            if (blockId !== 1) {
                // Знаходимо блок у cellContainer
                const block = this.cellContainer.children.find(
                    (child) => {
                        return (
                            child.block &&
                            child.block.id === blockId &&
                            child.block.col === col &&
                            child.block.row === row
                        );
                    }
                );
                if (block && block.block.isMovable) {
                    if (this.checkPlacementConditions(row, col, block.block.id)) {
                        this.onBlockGrab(block);
                    }
                }
            }
        }
    }


    onBlockGrab(block) {
        this.draggedBlock = block;

        // Зберігаємо координати миші та початкові координати блоку
        // this.initialMousePosition = mousePosition;
        this.initialBlockPosition = {x: block.x, y: block.y};

        // Додаємо обробник для pointermove та pointerup
        // this.app.stage.on('pointermove', this.onPointerMoveHandler);
        this.app.stage.on('pointerup', this.onPointerUpHandler);
        this.app.ticker.add(this.updateBlockPosition, this);
    }

    updateBlockPosition() {
        if (!this.draggedBlock) return;

        let deltaX = this.mousePosition.x - this.initialMousePosition.x;
        let deltaY = this.mousePosition.y - this.initialMousePosition.y;

        let col = Math.round(this.draggedBlock.x / this.cellWidth);
        let row = Math.round(this.draggedBlock.y / this.cellHeight);

        let directionX = deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0;
        let directionY = deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0;

        // if (this.gameMatrix[row][col + directionX] !== 1) {
        //     if (directionX > 0) {
        //         col = Math.floor(this.draggedBlock.x / this.cellWidth);
        //         row = Math.floor(this.draggedBlock.y / this.cellHeight);
        //     } else if (directionX < 0) {
        //         col = Math.ceil(this.draggedBlock.x / this.cellWidth);
        //         row = Math.ceil(this.draggedBlock.y / this.cellHeight);
        //     }
        // }
        //
        // const nextRow = row + directionY;
        // console.log('nextRow',nextRow)
        // console.log(this.gameMatrix[nextRow][col])
        // if (nextRow >= 0 && nextRow < this.gameMatrix.length && this.gameMatrix[nextRow][col] !== 1) {
        //     if (directionY > 0) {
        //         col = Math.ceil(this.draggedBlock.x / this.cellWidth);
        //         row = Math.ceil(this.draggedBlock.y / this.cellHeight);
        //     } else if (directionY < 0) {
        //         col = Math.floor(this.draggedBlock.x / this.cellWidth);
        //         row = Math.floor(this.draggedBlock.y / this.cellHeight);
        //     }
        // }

        if (Math.abs(deltaX) > Math.abs(deltaY) && this.gameMatrix[row][col + directionX] === 1) {
            this.draggedBlock.y = this.initialBlockPosition.y;
            this.draggedBlock.x = this.initialBlockPosition.x + deltaX;
        }else if (Math.abs(deltaX) < Math.abs(deltaY)) {
            // Ensure the row index is within bounds
            const nextRow = row + directionY;
            if (nextRow >= 0 && nextRow < this.gameMatrix.length && this.gameMatrix[nextRow][col] === 1) {
                this.draggedBlock.x = this.initialBlockPosition.x;
                this.draggedBlock.y = this.initialBlockPosition.y + deltaY;
            }
        }
        // Якщо попередні значення не встановлені, ініціалізуємо їх
        if (this.previousCol === null || this.previousRow === null) {
            this.previousCol = col;
            this.previousRow = row;
        }

        // Перевірка, чи блок не може бути переміщений, якщо він на своєму місці
        if (!this.checkPlacementConditions(row, col, this.draggedBlock.block.id)) {
            // Якщо блок не може бути переміщений, повертаємо його на початкову позицію
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
            return;
        }

        // Перевіряємо, чи змінилася колонка або рядок
        if (col !== this.previousCol || row !== this.previousRow) {
            this.updateMatrixAndPosition(this.previousRow, this.previousCol, row, col);
            this.previousCol = col;
            this.previousRow = row;
        }
    }

// Допоміжний метод для оновлення матриці та позиції
    updateMatrixAndPosition(row, col, nextRow, nextCol) {
        // Оновлюємо матрицю
        this.gameMatrix[row][col] = 1;
        this.gameMatrix[nextRow][nextCol] = this.draggedBlock.block.id;

    }


    onBlockDrop() {
        if (!this.draggedBlock) return;
        console.log('drop')

        const col = Math.round(this.draggedBlock.x / this.cellWidth);
        const row = Math.round(this.draggedBlock.y / this.cellHeight);
        console.log(row)

        // Перевіряємо, чи блок може бути поставлений на новому місці
        if (!this.checkPlacementConditions(row, col, this.draggedBlock.block.id)) {
            // Якщо блок не можна поставити, повертаємо його на початкову позицію
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
            return;
        }

        this.draggedBlock.x = col * this.cellWidth;
        this.draggedBlock.y = row * this.cellHeight;

        this.draggedBlock.block.col = col;
        this.draggedBlock.block.row = row;

        console.log(row)

        const prevCol = Math.round(this.initialBlockPosition.x / this.cellWidth);
        const prevRow = Math.round(this.initialBlockPosition.y / this.cellHeight);
        this.gameMatrix[prevRow][prevCol] = 1; // Відновлюємо попередню позицію
        this.gameMatrix[this.previousRow][this.previousCol] = this.draggedBlock.block.id; // Встановлюємо нову позиціюЂЂЂ
        // Перевірка, чи всі блоки на своїх місцях
        if (this.checkAllBlocksInPlace()) {
            console.log('Всі блоки на своїх місцях!');
            this.loadNextLevel();
        }

        this.previousRow = null;
        this.previousCol = null;
        this.draggedBlock = null;

        console.log(this.gameMatrix);
    }

    clearCurrentLevel() {
        // Видаляємо всі блоки з контейнера
        this.cellContainer.removeChildren();
        this.blocks = []; // Очищуємо масив блоків
        this.gameMatrix = this.createMatrix(); // Скидаємо матрицю
    }

    loadNextLevel() {
        this.clearCurrentLevel(); // Очищаємо поточний рівень
        this.currentLevel++; // Переходимо до наступного рівня

        // Перевіряємо, чи є наступний рівень
        if (this.currentLevel < this.levels.length) {
            this.populateLevel(this.currentLevel); // Заповнюємо новий рівень
        } else {
            console.log('Вітаємо! Ви пройшли всі рівні!');
            // Тут можна додати логіку для завершення гри або перезапуску
        }
    }

}
