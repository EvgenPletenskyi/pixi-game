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
        // this.blocks = [];
        this.container = new Container();
        this.cellContainer = new Container();
        this.app.stage.addChild(this.container);
        this.cellWidth = 70;
        this.cellHeight = 70;
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

        level.forEach(({row, col, type}) => {
            if (this.gameMatrix[row][col] === 1) {
                const {id, sprite} = spriteMap[type];
                const texture = Texture.from(sprite);
                const gameSprite = new Sprite(texture);

                const block = new Block(id);
                gameSprite.block = block;
                // this.blocks.push(block);

                if (block.isMovable) {
                    gameSprite.interactive = true;
                    gameSprite.buttonMode = true;
                    gameSprite
                        .on('mousedown', this.onBlockGrab.bind(this))
                }


                gameSprite.x = col * this.cellWidth;
                gameSprite.y = row * this.cellHeight;

                this.cellContainer.addChild(gameSprite);

                this.gameMatrix[row][col] = block.id;
            }
        });
    }


    onBlockGrab(event) {
        const target = event.target;

        this.draggedBlock = target;
        this.initialMousePosition = event.data.getLocalPosition(this.cellContainer);
        this.initialBlockPosition = {x: target.x, y: target.y};

        target.on('mousemove', this.onBlockMove.bind(this));
        target.on('mouseup', this.onBlockDrop.bind(this));
    }

    onBlockMove(event) {

        const mousePosition = event.data.getLocalPosition(this.cellContainer);

        // Визначаємо нову позицію блоку
        const deltaX = mousePosition.x - this.initialMousePosition.x;
        const deltaY = mousePosition.y - this.initialMousePosition.y;

        // Обмежуємо рух по осі X або Y в залежності від першого руху
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            console.log(this.initialBlockPosition.y)
            this.draggedBlock.y = this.initialBlockPosition.y;
            this.draggedBlock.x = this.initialBlockPosition.x + deltaX;
        } else {
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y + deltaY;
        }

    }

    onBlockDrop() {
        console.log('done')
        if (!this.draggedBlock) return;

        // Визначаємо клітинку, до якої ближче блок
        const col = Math.round(this.draggedBlock.x / this.cellWidth);
        const row = Math.round(this.draggedBlock.y / this.cellHeight);

        // Перевіряємо, чи клітинка в межах матриці та чи не є "0"
        if (
            row >= 0 &&
            row < this.gameMatrix.length &&
            col >= 0 &&
            col < this.gameMatrix[0].length &&
            this.gameMatrix[row][col] === 1
        ) {
            // Закріплюємо блок на новій позиції
            this.draggedBlock.x = col * this.cellWidth;
            this.draggedBlock.y = row * this.cellHeight;

            // Оновлюємо матрицю
            const prevCol = Math.round(this.initialBlockPosition.x / this.cellWidth);
            const prevRow = Math.round(this.initialBlockPosition.y / this.cellHeight);
            this.gameMatrix[prevRow][prevCol] = 1; // Звільняємо попередню клітинку
            this.gameMatrix[row][col] = this.draggedBlock.block.id; // Займаємо нову клітинку
        } else {
            // Повертаємо блок на початкову позицію
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
        }
        this.draggedBlock.off('mousemove');
        this.draggedBlock.off('mouseup');
        this.draggedBlock = null;
        console.log(this.gameMatrix)
    }
    onMouseOutside() {
        console.log('outside')
    }

}
