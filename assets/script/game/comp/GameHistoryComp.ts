import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export interface GameRecord {
    id: number;
    timestamp: number;
    betAmount: number;
    crashMultiplier: number;
    cashOutMultiplier: number;
    profit: number;
    isWin: boolean;
}

@ecs.register('GameHistory')
export class GameHistoryComp extends ecs.Comp {
    gameHistory: GameRecord[] = [];
    maxHistoryCount: number = 50;

    addRecord(record: GameRecord): void {
        this.gameHistory.unshift(record);
        if (this.gameHistory.length > this.maxHistoryCount) {
            this.gameHistory.pop();
        }
    }

    reset() {
        this.gameHistory = [];
    }
}