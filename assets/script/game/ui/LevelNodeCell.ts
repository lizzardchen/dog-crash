import { _decorator, Button, Component, Label, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

export enum LevelState{
    Lock = 0,
    Unlock = 1,
    Clear = 2,
}

@ccclass('LevelNodeCell')
export class LevelNodeCell extends Component {

    @property(Button)
    btn:Button = null!;

    @property(Label)
    indexLabel:Label = null!;

    @property(Node)
    pathbgNode:Node = null!;

    @property(Node)
    pathNode:Node = null!;

    @property([Sprite])
    levelStateSprite:Sprite[] = [];

    private idx:number = 0;
    private levelState:LevelState = LevelState.Lock;

    private _callback:Function = null!;

    start() {

    }

    update(deltaTime: number) {
        
    }

    setState(levelState:LevelState){
        this.levelState = levelState;
        this.updateState();
    }

    setIndex(index:number){
        this.idx = index;
        this.indexLabel.string = (index+1).toString();
        this.updateState();
    }

    setCallBack(callback:Function){
        this._callback = callback;
        if(this.btn){
            //添加按钮响应事件
            this.btn.node.on(Button.EventType.CLICK, this.onButtonClick, this);
        }
    }

    private onButtonClick(){
        if(this._callback && this.levelState !== LevelState.Lock){
            this._callback(this.idx);
        }
    }

    onDestroy(){
        if(this.btn){
            this.btn.node.off(Button.EventType.CLICK, this.onButtonClick, this);
        }
    }

    private updateState(){
        this.levelStateSprite.forEach((sprite)=>{
            sprite.node.active = false;
        })
        switch(this.levelState){
            case LevelState.Lock:{
                this.btn.interactable = false;
                this.pathNode.active = false;
                this.pathbgNode.active = false; 
                this.levelStateSprite[0].node.active = true;              
                break;
            }
            case LevelState.Unlock:{
                this.btn.interactable = true;
                this.pathNode.active = false;
                this.pathbgNode.active = true;
                this.levelStateSprite[1].node.active = true;
                break;
            }
            case LevelState.Clear:{
                this.btn.interactable = true;
                this.pathNode.active = true;
                this.pathbgNode.active = true;
                this.levelStateSprite[2].node.active = true;
                break;
            }
        }
        if( this.idx == 99 ){
            this.pathNode.active = false;
            this.pathbgNode.active = false;
        }else{
            this.pathbgNode.active = true;
            if(this.levelState != LevelState.Lock){
                this.pathNode.active = true;
            }else{
                this.pathNode.active = false;
            }
        }
    }
    
}

