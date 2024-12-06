const {Container, Sprite, Texture, Graphics, TextStyle, Text} = PIXI;
import {Block} from './Block.js';
import {level_1} from '../levels/level_1.js';
import {level_2} from '../levels/level_2.js';
import {level_3} from '../levels/level_3.js';
import {spriteMap} from '../sprites/spriteMap.js';

export default class Game {
    constructor(app) {
        this.app = app;
        this.levels = [level_1, level_2, level_3];
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
        if ((row === 0 && col === 1 && blockId !== 4) ||
            (row === 0 && col === 7 && blockId !== 5) ||
            (row === 7 && col === 1 && blockId !== 6) ||
            (row === 7 && col === 7 && blockId !== 7)) {
            return false;
        }
        return true;
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

    onPointerDown(event) {
        const localPos = event.data.getLocalPosition(this.cellContainer);
        this.initialMousePosition = {x: localPos.x, y: localPos.y};

        const col = Math.floor(localPos.x / this.cellWidth);
        const row = Math.floor(localPos.y / this.cellHeight);

        if (
            row >= 0 &&
            row < this.gameMatrix.length &&
            col >= 0 &&
            col < this.gameMatrix[0].length
        ) {
            const blockId = this.gameMatrix[row][col];
            if (blockId !== 1) {
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

        this.initialBlockPosition = {x: block.x, y: block.y};

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

        if (Math.abs(deltaX) > Math.abs(deltaY) && this.gameMatrix[row][col + directionX] === 1) {
            this.draggedBlock.y = this.initialBlockPosition.y;
            this.draggedBlock.x = this.initialBlockPosition.x + deltaX;
        } else if (Math.abs(deltaX) < Math.abs(deltaY)) {
            const nextRow = row + directionY;
            if (nextRow >= 0 && nextRow < this.gameMatrix.length && this.gameMatrix[nextRow][col] === 1) {
                this.draggedBlock.x = this.initialBlockPosition.x;
                this.draggedBlock.y = this.initialBlockPosition.y + deltaY;
            }
        }

        if (this.previousCol === null || this.previousRow === null) {
            this.previousCol = col;
            this.previousRow = row;
        }

        if (!this.checkPlacementConditions(row, col, this.draggedBlock.block.id)) {
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
            return;
        }

        if (col !== this.previousCol || row !== this.previousRow) {
            this.updateMatrixAndPosition(this.previousRow, this.previousCol, row, col);
            this.previousCol = col;
            this.previousRow = row;
        }

    }

    updateMatrixAndPosition(row, col, nextRow, nextCol) {
        this.gameMatrix[row][col] = 1;
        this.gameMatrix[nextRow][nextCol] = this.draggedBlock.block.id;

    }


    onBlockDrop() {
        if (!this.draggedBlock) return;

        const col = Math.round(this.draggedBlock.x / this.cellWidth);
        const row = Math.round(this.draggedBlock.y / this.cellHeight);

        if (this.previousCol === null || this.previousRow === null) {
            this.previousCol = col;
            this.previousRow = row;
        }

        if (!this.checkPlacementConditions(row, col, this.draggedBlock.block.id)) {
            this.draggedBlock.x = this.initialBlockPosition.x;
            this.draggedBlock.y = this.initialBlockPosition.y;
            return;
        }

        this.draggedBlock.x = col * this.cellWidth;
        this.draggedBlock.y = row * this.cellHeight;

        this.draggedBlock.block.col = col;
        this.draggedBlock.block.row = row;

        const prevCol = Math.round(this.initialBlockPosition.x / this.cellWidth);
        const prevRow = Math.round(this.initialBlockPosition.y / this.cellHeight);
        this.gameMatrix[prevRow][prevCol] = 1;
        this.gameMatrix[this.previousRow][this.previousCol] = this.draggedBlock.block.id;

        if (this.checkAllBlocksInPlace()) {
            this.createPopup("Level Complete!", () => {
                this.loadPrevLevel();
            }, () => {
                this.loadNextLevel();
            }, () => {
                window.close();
            });
        }

        this.previousRow = null;
        this.previousCol = null;
        this.draggedBlock = null;

        console.log(this.gameMatrix);
    }

    clearCurrentLevel() {
        this.cellContainer.removeChildren();
        this.blocks = [];
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

    createPopup(message, onPrevLevel, onNextLevel, onClose) {
        const popupContainer = new Container();

        const background = new Graphics();
        background.beginFill(0x000000, 0.7);
        background.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        background.endFill();
        background.interactive = true;
        popupContainer.addChild(background);

        const popup = new PIXI.Graphics();
        const popupWidth = 400;
        const popupHeight = 200;
        popup.beginFill(0xffffff);
        popup.drawRoundedRect(
            (this.app.screen.width - popupWidth) / 2,
            (this.app.screen.height - popupHeight) / 2,
            popupWidth,
            popupHeight,
            20
        );
        popup.endFill();
        popupContainer.addChild(popup);

        const style = new TextStyle({
            fontFamily: "Arial",
            fontSize: 24,
            fill: "#000000",
            align: "center",
        });
        const text = new Text(message, style);
        text.anchor.set(0.5);
        text.x = this.app.screen.width / 2;
        text.y = this.app.screen.height / 2 - 20;
        popupContainer.addChild(text);

        if (this.currentLevel !== 0) {
            const prevButton = new Graphics();
            prevButton.beginFill(0xff0000); // Червона кнопка
            prevButton.drawRoundedRect(0, 0, 150, 50, 10);
            prevButton.endFill();
            prevButton.x = (this.app.screen.width - 150) / 2;
            prevButton.y = (this.app.screen.height + popupHeight) / 2 - 100;
            prevButton.interactive = true;
            prevButton.buttonMode = true;
            popupContainer.addChild(prevButton);

            const prevButtonText = new Text("Previous Level", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            prevButtonText.anchor.set(0.5);
            prevButtonText.x = prevButton.width / 2;
            prevButtonText.y = prevButton.height / 2;
            prevButton.addChild(prevButtonText);

            prevButton.on("pointerdown", () => {
                onPrevLevel();
                this.container.removeChild(popupContainer);
            });
        }

        if (this.currentLevel !== this.levels.length - 1) {
            const nextButton = new Graphics();
            nextButton.beginFill(0x007bff); // Синя кнопка
            nextButton.drawRoundedRect(0, 0, 150, 50, 10);
            nextButton.endFill();
            nextButton.x = (this.app.screen.width - 150) / 2;
            nextButton.y = (this.app.screen.height + popupHeight) / 2 - 40;
            nextButton.interactive = true;
            nextButton.buttonMode = true;
            popupContainer.addChild(nextButton);

            const nextButtonText = new Text("Next Level", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            nextButtonText.anchor.set(0.5);
            nextButtonText.x = nextButton.width / 2;
            nextButtonText.y = nextButton.height / 2;
            nextButton.addChild(nextButtonText);

            nextButton.on("pointerdown", () => {
                onNextLevel();
                this.container.removeChild(popupContainer);
            });
        }

        if (this.currentLevel === this.levels.length - 1) {
            const closeButton = new Graphics();
            closeButton.beginFill(0x007bff);
            closeButton.drawRoundedRect(0, 0, 150, 50, 10);
            closeButton.endFill();
            closeButton.x = (this.app.screen.width - 150) / 2;
            closeButton.y = (this.app.screen.height + popupHeight) / 2 - 40;
            closeButton.interactive = true;
            closeButton.buttonMode = true;
            popupContainer.addChild(closeButton);

            const closeButtonText = new Text("Close", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            closeButtonText.anchor.set(0.5);
            closeButtonText.x = closeButton.width / 2;
            closeButtonText.y = closeButton.height / 2;
            closeButton.addChild(closeButtonText);

            closeButton.on("pointerdown", () => {
                onClose();
                this.container.removeChild(popupContainer);
            });
        }


        this.container.addChild(popupContainer);
    }
}
