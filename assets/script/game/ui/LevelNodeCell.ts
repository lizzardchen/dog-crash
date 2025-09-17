import { _decorator, Button, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelNodeCell')
export class LevelNodeCell extends Component {

    @property(Button)
    btn:Button = null!;

    start() {

    }

    update(deltaTime: number) {
        
    }
}

