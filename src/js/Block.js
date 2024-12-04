export class Block {
    constructor(id) {
        this.id = id;
        this.isMovable = this.checkForMovable();
    }

    canMove() {
        return this.isMovable;
    }

    checkForMovable() {
        if (this.id !== 2) {
            return true;
        }
    }
}
