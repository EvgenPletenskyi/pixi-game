export class Block {
    constructor(id) {
        this.id = id;
        this.isMovable = this.checkForMovable();
    }

    checkForMovable() {
        if (this.id !== 2) {
            return true;
        }
    }
}
