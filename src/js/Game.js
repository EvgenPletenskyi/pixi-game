const { Container, Sprite, Texture, Graphics } = PIXI;
import { Block } from './Block.js';
import { level_1 } from '../levels/level_1.js';
import { spriteMap } from '../sprites/spriteMap.js';

export default class Game {
    constructor(app) {
        this.app = app;
        this.levels = [level_1];
        this.gameMatrix = this.createMatrix();
        this.blocks = [];
        this.currentLevel = 0;
        this.container = new Container();
        this.cellContainer = new Container();
        this.app.stage.addChild(this.container);
        this.cellWidth = 70;
        this.cellHeight = 70;

        // Зберігаємо функції, щоб можна було знімати події
        this.onPointerMoveHandler = this.onBlockMove.bind(this);
        this.onPointerUpHandler = this.onBlockDrop.bind(this);
    }

    createMatrix() {
        return [
            [1, 1, 1, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 0, 0, 0, 1, 1, 1]
        ];
    }

    init() {
        this.createBackground();
        this.drawCells();
        this.populateLevel(this.currentLevel);

        this.app.stage.interactive = true;

        // Додаємо обробник події pointerdown на app.view
        this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
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
        this.cellContainer.y = 173.5;
        this.container.addChild(this.cellContainer);
    }

    populateLevel(levelIndex) {
        const level = this.levels[levelIndex];
        if (!level) return;

        level.forEach(({ row, col, type }) => {
            if (this.gameMatrix[row][col] === 1) {
                const { id, sprite } = spriteMap[type];
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


    onPointerDown(event) {
        const localPos = event.data.getLocalPosition(this.cellContainer);
        console.log(localPos);

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
            console.log(blockId);
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
                console.log(block);
                if (block && block.block.isMovable) {
                    const mousePosition = { x: localPos.x, y: localPos.y };
                    this.onBlockGrab(mousePosition, block);
                }
            }
        }
    }


    onBlockGrab(mousePosition, block) {
        this.draggedBlock = block;

        // Зберігаємо координати миші та початкові координати блоку
        this.initialMousePosition = mousePosition;
        this.initialBlockPosition = { x: block.x, y: block.y };

        // Додаємо обробник для pointermove та pointerup
        this.app.stage.on('pointermove', this.onPointerMoveHandler);
        this.app.stage.on('pointerup', this.onPointerUpHandler);
    }

    onBlockMove(event) {
        // Отримуємо нову позицію миші
        const localPos = event.data.getLocalPosition(this.cellContainer);

        const deltaX = localPos.x - this.initialMousePosition.x;
        const deltaY = localPos.y - this.initialMousePosition.y;

        // Оновлюємо позицію блоку на основі переміщення миші
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.draggedBlock.y = this.initialBlockPosition.y;
            this.draggedBlock.x = this.initialBlockPosition.x + deltaX;
        } else {
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y + deltaY;
        }
    }

    onBlockDrop() {
        if (!this.draggedBlock) return;

        const col = Math.round(this.draggedBlock.x / this.cellWidth);
        const row = Math.round(this.draggedBlock.y / this.cellHeight);

        if (
            row >= 0 &&
            row < this.gameMatrix.length &&
            col >= 0 &&
            col < this.gameMatrix[0].length &&
            this.gameMatrix[row][col] === 1
        ) {
            // Оновлюємо координати блоку
            this.draggedBlock.x = col * this.cellWidth;
            this.draggedBlock.y = row * this.cellHeight;

            // Оновлюємо координати в об'єкті блоку
            this.draggedBlock.block.col = col;
            this.draggedBlock.block.row = row;

            // Оновлюємо гру в матриці
            const prevCol = Math.round(this.initialBlockPosition.x / this.cellWidth);
            const prevRow = Math.round(this.initialBlockPosition.y / this.cellHeight);
            this.gameMatrix[prevRow][prevCol] = 1;
            this.gameMatrix[row][col] = this.draggedBlock.block.id;
        } else {
            // Якщо блок не на допустимій позиції, повертаємо на початкову позицію
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
        }

        // Видаляємо обробники подій
        this.app.stage.off('pointermove', this.onPointerMoveHandler);
        this.app.stage.off('pointerup', this.onPointerUpHandler);

        this.draggedBlock = null;
    }

}
