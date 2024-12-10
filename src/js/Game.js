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
        // this.onPointerMoveHandler = this.updateBlockPosition.bind(this);
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
        this.app.stage.on('pointerup', this.onPointerUpHandler);
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
                    this.onBlockGrab(block);
                }
            }
        }
    }


    onBlockGrab(block) {
        this.draggedBlock = block;
        this.initialBlockPosition = {x: block.x, y: block.y};

        let elapsed = 0;
        const interval = 30;
        let isMoving = false;
        let draggedCol = false;
        let draggedRow = false;
        let dragged = false;

        this.updateTicker = () => {
            elapsed += this.app.ticker.elapsedMS;

            let targetCol = Math.floor(this.mousePosition.x / this.cellWidth);
            let targetRow = Math.floor(this.mousePosition.y / this.cellHeight);
            let deltaX = this.mousePosition.x - this.initialMousePosition.x;
            let deltaY = this.mousePosition.y - this.initialMousePosition.y;
            let directionX = Math.sign(deltaX);
            let directionY = Math.sign(deltaY);
            let col = Math.ceil(this.initialBlockPosition.x / this.cellWidth);
            let row = Math.ceil(this.initialBlockPosition.y / this.cellHeight);
            let nextCol = col + directionX
            let nextRow = row + directionY;


            if (this.mousePosition.x >= this.draggedBlock.x &&
                this.mousePosition.y >= this.draggedBlock.y &&
                this.mousePosition.x <= this.draggedBlock.x + this.cellWidth &&
                this.mousePosition.y <= this.draggedBlock.y + this.cellHeight &&
                !isMoving &&
                !dragged
            ) {
                let nextCol = col + directionX
                let nextRow = row + directionY;
                if (Math.abs(deltaX) - Math.abs(deltaY) > 3) {
                    if (this.gameMatrix[row][nextCol] === 1 && nextCol >= 0 && nextCol <= this.gameMatrix[0].length - 1 && this.draggedBlock.y % this.cellHeight === 0) {
                        this.draggedBlock.y = this.initialBlockPosition.y;
                        this.draggedBlock.x = Math.round(this.initialBlockPosition.x + deltaX);
                    }
                    if (Math.round(Math.abs(deltaX)) >= 70) {
                        console.log('aoaoaooa')
                        this.gameMatrix[row][col] = 1;
                        this.draggedBlock.x = nextCol * this.cellWidth;
                        this.initialBlockPosition.x = this.draggedBlock.x;
                        this.initialMousePosition.x = this.mousePosition.x;
                        this.initialBlockPosition.y = this.draggedBlock.y;
                        this.initialMousePosition.y = this.mousePosition.y;
                    }
                } else if(Math.abs(deltaY) - Math.abs(deltaX) > 3) {
                    if (this.gameMatrix[nextRow][col] === 1 && nextRow >= 0 && nextRow <= this.gameMatrix.length - 1 && this.draggedBlock.x % this.cellWidth === 0) {
                        this.draggedBlock.x = this.initialBlockPosition.x;
                        this.draggedBlock.y = Math.round(this.initialBlockPosition.y + deltaY);
                    }
                    if (Math.round(Math.abs(deltaY))>= 70) {
                        this.gameMatrix[row][col] = 1;
                        this.draggedBlock.y = targetRow * this.cellHeight;
                        this.initialBlockPosition.x = this.draggedBlock.x;
                        this.initialMousePosition.x = this.mousePosition.x;
                        this.initialBlockPosition.y = this.draggedBlock.y;
                        this.initialMousePosition.y = this.mousePosition.y;
                    }
                }

            }else if (this.gameMatrix[row][nextCol] !== 1 && !draggedRow) {
                console.log(nextRow)
                if (this.gameMatrix[nextRow][col] === 1 && nextRow >= 0 && nextRow <= this.gameMatrix.length - 1 && this.draggedBlock.x % this.cellWidth === 0) {
                    this.draggedBlock.y = Math.round(this.initialBlockPosition.y + deltaY);

                    if (Math.round(Math.abs(deltaY))>= 70 && this.gameMatrix[nextRow][col] === 1) {
                        this.gameMatrix[row][col] = 1;
                        this.draggedBlock.y = targetRow * this.cellHeight;
                        this.initialBlockPosition.y = this.draggedBlock.y;
                        this.initialMousePosition.y = this.mousePosition.y;
                        draggedCol = false;
                    }
                    draggedCol = true
                }
            }else if (this.gameMatrix[nextRow][col] !== 1 && !draggedCol) {
                console.log('popopopo')
                if (this.gameMatrix[row][nextCol] === 1 && nextCol >= 0 && nextCol <= this.gameMatrix[0].length - 1 && this.draggedBlock.y % this.cellWidth === 0) {
                    console.log(deltaX)
                    this.draggedBlock.x = Math.round(this.initialBlockPosition.x + deltaX);

                    if (Math.round(Math.abs(deltaX))>= 70 && this.gameMatrix[row][nextCol] === 1) {
                        console.log('ratatatatatata')
                        this.gameMatrix[row][col] = 1;
                        this.draggedBlock.x = targetCol * this.cellHeight;
                        this.initialBlockPosition.x = this.draggedBlock.x;
                        this.initialMousePosition.x = this.mousePosition.x;
                        draggedRow = false;
                    }
                    draggedRow = true
                }
            } else if (this.gameMatrix[row][nextCol] === 1 || this.gameMatrix[nextRow][col] === 1 && !draggedCol && !draggedRow)  {
                isMoving = true;
                dragged =  true;
                if (elapsed >= interval) {
                    elapsed -= interval;

                    // Плавне наближення до цілого значення
                    if (this.draggedBlock.x % this.cellWidth !== 0) {
                        this.draggedBlock.x = Math.round(this.draggedBlock.x / 10) * 10;
                    }
                    // Плавне наближення до цілого значення
                    if (this.draggedBlock.y % this.cellHeight !== 0) {
                        this.draggedBlock.y = Math.round(this.draggedBlock.y / 10) * 10;
                    }
                    if (targetCol !== col && this.draggedBlock.y % this.cellHeight === 0  && this.gameMatrix[row][col + directionX] === 1 && col + directionX < this.gameMatrix[0].length && col + directionX >= 0) {
                        this.draggedBlock.x += (targetCol > col) ? 10 : -10;
                        this.gameMatrix[row][col] = 1;
                        if (this.draggedBlock.x % this.cellWidth === 0) {
                            this.initialBlockPosition.x = this.draggedBlock.x;
                            this.initialMousePosition.x += (targetCol > col) ? this.cellWidth : -this.cellWidth;
                        }

                    } else if (targetRow !== row && this.draggedBlock.x % this.cellWidth === 0 && this.gameMatrix[row + directionY][col] === 1 && row + directionY < this.gameMatrix.length && row + directionY >= 0) {
                        this.draggedBlock.y += (targetRow > row) ? 10 : -10;
                        this.gameMatrix[row][col] = 1;
                        if (this.draggedBlock.y % this.cellHeight === 0) {
                            this.initialBlockPosition.y = this.draggedBlock.y;
                            this.initialMousePosition.y += (targetRow > row) ? this.cellHeight : -this.cellHeight;
                        }
                    }
                }
            }
        };

        this.app.ticker.add(this.updateTicker);
    }

    onBlockDrop() {
        console.log(this.gameMatrix)
        if (!this.draggedBlock) return;

        this.app.ticker.remove(this.updateTicker);

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
