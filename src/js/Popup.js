const {Container, Graphics, TextStyle, Text} = PIXI;

export class Popup {
    constructor(message, onPrevLevel, onNextLevel, onClose, currentLevel, levels) {
        this.message = message;
        this.onPrevLevel = onPrevLevel;
        this.onNextLevel = onNextLevel;
        this.onClose = onClose;
        this.currentLevel = currentLevel;
        this.levels = levels;

        this.popupContainer = new Container();
        this.createPopup();
    }

    createPopup() {
        const background = new Graphics();
        background.beginFill(0x000000, 0.7);
        background.drawRect(0, 0, 1024, 768); // Розмір попапу
        background.endFill();
        background.interactive = true;
        this.popupContainer.addChild(background);

        const popup = new PIXI.Graphics();
        const popupWidth = 400;
        const popupHeight = 200;
        popup.beginFill(0xffffff);
        popup.drawRoundedRect(
            (1024 - popupWidth) / 2,
            (768 - popupHeight) / 2,
            popupWidth,
            popupHeight,
            20
        );
        popup.endFill();
        this.popupContainer.addChild(popup);

        const style = new TextStyle({
            fontFamily: "Arial",
            fontSize: 24,
            fill: "#000000",
            align: "center",
        });
        const text = new Text(this.message, style);
        text.anchor.set(0.5);
        text.x = (1024) / 2;
        text.y = (768 - popupHeight) / 2 + 30;
        this.popupContainer.addChild(text);

        if (this.currentLevel !== 0) {
            const prevButton = new Graphics();
            prevButton.beginFill(0xff0000); // Червона кнопка
            prevButton.drawRoundedRect(0, 0, 150, 50, 10);
            prevButton.endFill();
            prevButton.x = (1024 - 150) / 2;
            prevButton.y = (768 + popupHeight) / 2 - 100;
            prevButton.interactive = true;
            prevButton.buttonMode = true;
            this.popupContainer.addChild(prevButton);

            const prevButtonText = new Text("Previous Level", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            prevButtonText.anchor.set(0.5);
            prevButtonText.x = prevButton.width / 2;
            prevButtonText.y = prevButton.height / 2;
            prevButton.addChild(prevButtonText);

            prevButton.on("pointerdown", this.onPrevLevel);
        }

        if (this.currentLevel < this.levels.length - 1) {
            const nextButton = new Graphics();
            nextButton.beginFill(0x007bff); // Синя кнопка
            nextButton.drawRoundedRect(0, 0, 150, 50, 10);
            nextButton.endFill();
            nextButton.x = (1024 - 150) / 2;
            nextButton.y = (768 + popupHeight) / 2 - 40;
            nextButton.interactive = true;
            nextButton.buttonMode = true;
            this.popupContainer.addChild(nextButton);

            const nextButtonText = new Text("Next Level", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            nextButtonText.anchor.set(0.5);
            nextButtonText.x = nextButton.width / 2;
            nextButtonText.y = nextButton.height / 2;
            nextButton.addChild(nextButtonText);

            nextButton.on("pointerdown", this.onNextLevel);
        }

        if (this.currentLevel === this.levels.length - 1) {
            const closeButton = new Graphics();
            closeButton.beginFill(0x007bff);
            closeButton.drawRoundedRect(0, 0, 150, 50, 10);
            closeButton.endFill();
            closeButton.x = (1024 - 150) / 2;
            closeButton.y = (768 + popupHeight) / 2 - 40;
            closeButton.interactive = true;
            closeButton.buttonMode = true;
            this.popupContainer.addChild(closeButton);

            const closeButtonText = new Text("Close", {
                fontFamily: "Arial",
                fontSize: 18,
                fill: "#ffffff",
            });
            closeButtonText.anchor.set(0.5);
            closeButtonText.x = closeButton.width / 2;
            closeButtonText.y = closeButton.height / 2;
            closeButton.addChild(closeButtonText);

            closeButton.on("pointerdown", this.onClose);
        }
    }

    getPopupContainer() {
        return this.popupContainer;
    }
}