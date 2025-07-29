import { _decorator, Node, Label, Button, ScrollView, Prefab, instantiate, Layout, UITransform, Component } from 'cc';
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameHistoryComp, CrashRecord } from "../comp/GameHistoryComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";

const { ccclass, property } = _decorator;

@ccclass('HistoryPopupUI')
export class HistoryPopupUI extends Component {
    @property(Node)
    popupPanel: Node = null!;

    @property(ScrollView)
    scrollView: ScrollView = null!;

    @property(Node)
    content: Node = null!;

    @property(Prefab)
    historyItemPrefab: Prefab = null!;

    onLoad() {
        console.log("HistoryPopupUI loaded");
        
        // 初始设置为隐藏
        if (this.popupPanel) {
            this.popupPanel.active = false;
        }

        this.setupEvents();
    }

    private setupEvents(): void {
        // 监听打开历史记录弹窗的事件
        oops.message.on("OPEN_HISTORY_POPUP", this.toggleHistoryPopup, this);
    }
    private toggleHistoryPopup(): void {
        CrashGameAudio.playButtonClick();
        // this.showPopup();
        this.togglePopup();
    }

    private showPopup(): void {
        if (this.popupPanel) {
            this.popupPanel.active = true;
            this.updateHistoryList();

            console.log("History popup opened");
        }
    }

    private hidePopup(): void {
        if (this.popupPanel) {
            this.popupPanel.active = false;
            console.log("History popup closed");
        }
    }

    private togglePopup(): void {
        if (this.popupPanel) {
            if (this.popupPanel.active) {
                this.hidePopup();
            } else {
                this.showPopup();
            }
        }
    }

    private updateHistoryList(): void {
        if (!smc.crashGame || !this.content) return;

        const gameHistory = smc.crashGame.get(GameHistoryComp);
        if (!gameHistory) return;

        // 清空现有列表
        this.clearHistoryList();

        // 获取最近20条崩盘记录
        const recentRecords = gameHistory.getRecentCrashRecords(20);
        
        console.log(`Displaying ${recentRecords.length} crash records`);

        // 创建历史记录项
        recentRecords.forEach((record, index) => {
            this.createHistoryItem(record, index);
        });

        // 如果没有记录，显示空状态
        if (recentRecords.length === 0) {
            this.createEmptyStateItem();
        }

        // 强制刷新布局
        if (this.content.getComponent(Layout)) {
            this.content.getComponent(Layout)!.updateLayout();
        }
    }

    private clearHistoryList(): void {
        if (!this.content) return;

        // 移除所有子节点
        this.content.removeAllChildren();
    }

    private createHistoryItem(record: CrashRecord, index: number): void {
        if (!this.historyItemPrefab || !this.content) return;

        const itemNode = instantiate(this.historyItemPrefab);
        
        // 查找并更新各个标签
        const multiplierLabel = itemNode.getChildByName("MultiplierLabel")?.getComponent(Label);

        if (multiplierLabel) {
            multiplierLabel.string = `${record.crashMultiplier.toFixed(2)}x`;
        }

        this.content.addChild(itemNode);
    }

    private createEmptyStateItem(): void {
        if (!this.content) return;

        const emptyNode = new Node("EmptyState");
        const emptyLabel = emptyNode.addComponent(Label);
        emptyLabel.string = CrashGameLanguage.getText("no_history_records");
        emptyLabel.fontSize = 24;

        // 设置节点大小
        const uiTransform = emptyNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(400, 100);
        }

        this.content.addChild(emptyNode);
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("OPEN_HISTORY_POPUP", this.toggleHistoryPopup, this);
    }

}