import { _decorator, Component, Node, Label, Button } from 'cc';
const { ccclass, property } = _decorator;

interface DialogItem {
    speaker: 'Victor' | 'William';
    text: string;
}

@ccclass('DialogsUI')
export class DialogsUI extends Component {

    @property(Node)
    dialogsNode:Node = null!;

    @property(Node)
    leftDialogNode:Node = null!;

    @property(Node)
    rightDialogNode:Node = null!;

    @property(Label)
    leftDialogText:Label = null!;

    @property(Label)
    rightDialogText:Label = null!;

    @property(Button)
    leftNextButton:Button = null!;

    @property(Button)
    rightNextButton:Button = null!;

    private currentDialogs: DialogItem[] = [];
    private currentDialogIndex: number = 0;

    /**
     * 显示左侧对话框
     */
    showLeftDialog(){
        this.leftDialogNode.active = true;
    }

    /**
     * 隐藏左侧对话框
     */
    hideLeftDialog(){
        this.leftDialogNode.active = false;
    }

    /**
     * 显示右侧对话框
     */
    showRightDialog(){
        this.rightDialogNode.active = true;
    }

    /**
     * 隐藏右侧对话框
     */
    hideRightDialog(){
        this.rightDialogNode.active = false;
    }

    /**
     * 获取关卡对话数据
     */
    private getLevelDialogs(levelId: number): DialogItem[] {
        switch (levelId) {
            case 0: // 第1关
                return [
                    { speaker: 'Victor', text: 'I want to find a new home and hope everything goes smoothly.' },
                    { speaker: 'William', text: 'I will guard everything at the base.' },
                    { speaker: 'Victor', text: 'Wait for my good news.' },
                    { speaker: 'William', text: 'Good luck.' }
                ];
            case 4: // 第5关
                return [
                    { speaker: 'Victor', text: "I'm back." },
                    { speaker: 'William', text: 'How about it?' },
                    { speaker: 'Victor', text: 'Not very good, I have to go to even farther planets.' },
                    { speaker: 'William', text: 'I hope everything goes smoothly this time.' }
                ];
            case 9: // 第10关
                return [
                    { speaker: 'Victor', text: 'I have found a planet that appears to be my new home.' },
                    { speaker: 'William', text: 'Great! Can we go to our new home now?' },
                    { speaker: 'Victor', text: 'I need to go a few more times to confirm safety.' },
                    { speaker: 'William', text: 'Well, what you said makes sense.' }
                ];
            default:
                return [];
        }
    }

    /**
     * 显示剧情对话
     * @param levelId 关卡ID
     */
    showStoryDialog(levelId: number): void {
        this.currentDialogs = this.getLevelDialogs(levelId);
        this.currentDialogIndex = 0;
        
        if (this.currentDialogs.length > 0) {
            this.showDialogUI();
            this.showCurrentDialog();
        }
    }

    /**
     * 显示当前对话
     */
    private showCurrentDialog(): void {
        if (this.currentDialogIndex >= this.currentDialogs.length) {
            this.hideDialogUI();
            return;
        }

        const currentDialog = this.currentDialogs[this.currentDialogIndex];
        
        // 隐藏所有对话框
        this.hideAllDialogs();
        
        // 根据说话者显示对应的对话框
        if (currentDialog.speaker === 'Victor') {
            this.leftDialogText.string = `${currentDialog.speaker}:\n\n${currentDialog.text}`;
            this.showLeftDialog();
        } else {
            this.rightDialogText.string = `${currentDialog.speaker}:\n\n${currentDialog.text}`;
            this.showRightDialog();
        }
    }

    /**
     * 下一个对话
     */
    nextDialog(): void {
        this.currentDialogIndex++;
        this.showCurrentDialog();
    }

    /**
     * 隐藏所有对话框
     */
    private hideAllDialogs(): void {
        this.hideLeftDialog();
        this.hideRightDialog();
    }

    /**
     * 显示对话UI
     */
    private showDialogUI(): void {
        this.dialogsNode.active = true;
    }

    /**
     * 隐藏对话UI
     */
    private hideDialogUI(): void {
        this.hideAllDialogs();
        this.dialogsNode.active = false;
    }

    start() {
        // 初始化时隐藏对话UI
        this.hideDialogUI();
        
        // 绑定按钮事件
        if (this.leftNextButton) {
            this.leftNextButton.node.on('click', this.nextDialog, this);
        }
        if (this.rightNextButton) {
            this.rightNextButton.node.on('click', this.nextDialog, this);
        }
    }

    update(deltaTime: number) {
        
    }
    
}

