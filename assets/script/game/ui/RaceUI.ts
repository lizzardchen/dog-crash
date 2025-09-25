import { _decorator, Node, Label, Button, instantiate, Prefab, Color, Sprite, ScrollView } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { smc } from "../common/SingletonModuleComp";
import { RaceComp, RaceState, RaceInfo, RaceLeaderboardItem, UserRaceInfo } from '../comp/RaceComp';
import { CrashGameAudio } from "../config/CrashGameAudio";
import { UIID } from "../common/config/GameUIConfig";
import { BettingComp } from '../comp/BettingComp';

const { ccclass, property } = _decorator;


@ccclass('RaceUI')
@ecs.register('RaceUI', false)
export class RaceUI extends CCComp {
    // 顶部信息
    @property(Label)
    timeLabel: Label = null!;

    @property(Label)
    prizePoolLabel: Label = null!;

    // 前三名奖牌节点
    @property(Node)
    firstPlaceNode: Node = null!;

    @property(Node)
    secondPlaceNode: Node = null!;

    @property(Node)
    thirdPlaceNode: Node = null!;

    // 4-11名排行榜ScrollView
    @property(ScrollView)
    leaderboardScrollView: ScrollView = null!;

    @property(Node)
    leaderboardContent: Node = null!;

    @property(Prefab)
    leaderboardItemPrefab: Prefab = null!;

    @property(Node)
    detail_panel:Node = null!;

    // 打开detail按钮
    @property(Button)
    openDetailButton: Button = null!;

    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;

    // 关闭detail按钮
    @property(Button)
    closeDetailButton: Button = null!;

    @property(Button)
    joinRaceButton:Button = null!;

    private raceComp: RaceComp | null = null;

    private _params:any = null;

    onLoad() {
        console.log("RaceUI loaded");
        
        // 获取RaceComp引用
        if (smc.crashGame) {
            this.raceComp = smc.crashGame.get(RaceComp);
        }
        
        // 设置事件监听
        this.setupEvents();
        
        // 更新显示
        this.updateDisplayFromRaceComp();
    }

     onEnable() {
       if (smc.crashGame) {
            this.raceComp = smc.crashGame.get(RaceComp);
        } 
    }

    onDisable() {
        this.raceComp = null;
    }

    private setupEvents(): void {
        // 关闭按钮
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        if(this.openDetailButton){
            this.openDetailButton.node.on(Button.EventType.CLICK, this.onShowDetailButtonClick, this);
        }
        if(this.closeDetailButton){
            this.closeDetailButton.node.on(Button.EventType.CLICK, this.onCloseDetailButtonClick, this);
        }
        if(this.joinRaceButton){
            this.joinRaceButton.node.on(Button.EventType.CLICK,this.onJoinRaceButton,this);
        }
        
        // 监听比赛数据更新事件
        oops.message.on("RACE_DATA_UPDATED", this.onRaceDataUpdated, this);
    }

    public onShowRaceUI(params:any){
        this._params = params;
    }

    private onJoinRaceButton():void{
        if(!this._params){
            this._params = {};
        }
        this._params.joined = true;
        this.onCloseButtonClick();
    }

    private onShowDetailButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Race open detail button clicked");
        if(this.detail_panel){
            this.detail_panel.active = true;
        }
    }

    private onCloseDetailButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Race close detail button clicked");
        if(this.detail_panel){
            this.detail_panel.active = false;
        }
    }

    private onCloseButtonClick(): void {
        
        CrashGameAudio.playButtonClick();
        console.log("Race close button clicked");
        // 关闭整个UI界面
        oops.gui.remove(UIID.Race);
    }

    /**
     * 比赛数据更新事件处理
     */
    private onRaceDataUpdated(data: any): void {
        this.updateDisplayFromRaceComp();
    }

    /**
     * 从RaceComp更新显示
     */
    private updateDisplayFromRaceComp(): void {
        if (!this.raceComp) {
            console.warn("RaceComp not available");
            this.displayNoActiveRace();
            return;
        }
        
        switch (this.raceComp.state) {
            case RaceState.ACTIVE:
                if (this.raceComp.currentRace) {
                    this.updateDisplay(
                        this.raceComp.currentRace,
                        this.raceComp.leaderboard,
                        this.raceComp.userRaceInfo
                    );
                }
                break;
            case RaceState.LOADING:
                this.displayLoading();
                break;
            case RaceState.NO_RACE:
            case RaceState.ERROR:
            default:
                this.displayNoActiveRace();
                break;
        }
    }

    /**
     * 显示没有活跃比赛的状态
     */
    private displayNoActiveRace(): void {
        // if (this.titleLabel) {
        //     this.titleLabel.string = "BLAST-OFF!\nRACES";
        // }
        if (this.timeLabel) {
            this.timeLabel.string = "No active race";
        }
        if (this.prizePoolLabel) {
            this.prizePoolLabel.string = "0";
        }
        
        // 清空前三名显示
        this.clearPodiumDisplay();
        
        // 清空排行榜
        if (this.leaderboardContent) {
            this.leaderboardContent.removeAllChildren();
        }
    }

    /**
     * 显示加载状态
     */
    private displayLoading(): void {
        // if (this.titleLabel) {
        //     this.titleLabel.string = "BLAST-OFF!\nRACES";
        // }
        if (this.timeLabel) {
            this.timeLabel.string = "Loading...";
        }
        if (this.prizePoolLabel) {
            this.prizePoolLabel.string = "0";
        }
        
        this.clearPodiumDisplay();
        if (this.leaderboardContent) {
            this.leaderboardContent.removeAllChildren();
        }
    }
    
    /**
     * 更新所有显示信息
     */
    private updateDisplay(raceInfo: RaceInfo, leaderboard: RaceLeaderboardItem[], userInfo: UserRaceInfo | null): void {
        // 更新标题
        // if (this.titleLabel) {
        //     this.titleLabel.string = "BLAST-OFF!\nRACES";
        // }

        // 更新剩余时间
        if (this.timeLabel && this.raceComp) {
            const remainingText = this.raceComp.formatRemainingTime(raceInfo.remainingTime);
            this.timeLabel.string = `${remainingText}`;
        }

        // 更新奖池
        if (this.prizePoolLabel && this.raceComp) {
            const prizeText = this.raceComp.formatPrizePool(raceInfo.prizePool.totalPool);
            this.prizePoolLabel.string = `${prizeText}`;
        }

        // // 更新前三名奖牌显示
        // this.updatePodium(leaderboard.slice(0, 3));
        
        // 更新4-11名排行榜
        this.updateLeaderboard(leaderboard, userInfo);
    }

    /**
     * 更新前三名奖牌显示
     */
    private updatePodium(topThree: RaceLeaderboardItem[]): void {
        const podiumNodes = [this.firstPlaceNode, this.secondPlaceNode, this.thirdPlaceNode];
        
        podiumNodes.forEach((node, index) => {
            if (!node) return;
            
            if (index < topThree.length) {
                const item = topThree[index];
                this.updatePodiumNode(node, item);
                node.active = true;
            } else {
                node.active = false;
            }
        });
    }
    
    /**
     * 更新单个奖牌节点显示
     */
    private updatePodiumNode(node: Node, item: RaceLeaderboardItem): void {
        // 设置用户名
        const content_node = node.getChildByName("content");
        if (!content_node) return;
        const nameLabel = content_node.getChildByName("NameLabel")?.getComponent(Label);
        if (nameLabel && this.raceComp) {
            nameLabel.string = this.raceComp.formatUserId(item.userId);
        }
        
        // 设置奖励
        const profitLabel = content_node.getChildByName("ProfitLabel")?.getComponent(Label);
        if (profitLabel && this.raceComp) {
            const prizeAmount = this.raceComp.calculatePrizeAmount(item.rank);
            const prizeText = this.raceComp.formatPrizeNumber(prizeAmount);
            profitLabel.string = `${prizeText}`;
            
            // // 前三名固定金色
            // profitLabel.color = new Color(255, 215, 0, 255); // 金色
        }
    }
    
    /**
     * 清空前三名奖牌显示
     */
    private clearPodiumDisplay(): void {
        const podiumNodes = [this.firstPlaceNode, this.secondPlaceNode, this.thirdPlaceNode];
        podiumNodes.forEach(node => {
            if (node) {
                node.active = false;
            }
        });
    }

    /**
     * 更新排行榜显示 - 显示4-11名（包括用户如果不在前11名）
     */
    private updateLeaderboard(leaderboard: RaceLeaderboardItem[], userInfo: UserRaceInfo| null): void {
        if (!this.leaderboardContent || !this.leaderboardItemPrefab) {
            console.warn("Leaderboard content or prefab not found");
            return;
        }

        // 清空现有排行榜
        this.leaderboardContent.removeAllChildren();

        // 显示4-11名（跳过前3名）
        const leaderboardItems = leaderboard.slice(3); // 从第4名开始
        leaderboardItems.forEach((item, index) => {
            this.createLeaderboardItem(item, index + 4); // 排名从4开始
        });

        // 如果用户不在前11名，添加第12位显示用户
        if (userInfo && userInfo.rank > 11) {
            const userItem: RaceLeaderboardItem = {
                rank: userInfo.displayRank,
                userId: "YOU",
                netProfit: userInfo.netProfit,
                totalBetAmount: 0,
                sessionCount: userInfo.sessionCount
            };
            this.createLeaderboardItem(userItem, 12, true);
        }
    }

    /**
     * 创建排行榜项目
     */
    private createLeaderboardItem(item: RaceLeaderboardItem, displayPosition: number, isUser: boolean = false): void {
        if (!this.leaderboardItemPrefab || !this.leaderboardContent) return;

        try {
            const itemNode = instantiate(this.leaderboardItemPrefab);
            itemNode.name = `LeaderboardItem_${displayPosition}`;

            const content_node = itemNode.getChildByName("content");
            if (!content_node) return;

            // 设置排名
            const rankLabel = content_node.getChildByName("RankLabel")?.getComponent(Label);
            if (rankLabel) {
                rankLabel.string = item.rank.toString();
            }

            // 设置用户名
            const nameLabel = content_node.getChildByName("NameLabel")?.getComponent(Label);
            if (nameLabel && this.raceComp) {
                nameLabel.string = isUser ? "YOU" : this.raceComp.formatUserId(item.userId);
            }

            // 设置奖励
            const profitLabel = content_node.getChildByName("ProfitLabel")?.getComponent(Label);
            if (profitLabel && this.raceComp) {
                const prizeAmount = this.raceComp.calculatePrizeAmount(item.rank);
                const prizeText = this.raceComp.formatPrizeNumber(prizeAmount);
                profitLabel.string = `${prizeText}`;
                
                // 4-10名有奖励显示金色，11名以后无奖励显示灰色
                // if (prizeAmount > 0) {
                //     profitLabel.color = new Color(255, 215, 0, 255); // 金色
                // } else {
                //     profitLabel.color = new Color(150, 150, 150, 255); // 灰色
                // }
            }

            // 如果是用户自己，设置特殊背景色
            if (isUser) {
                const self_bg = itemNode.getChildByName('bg');
                if(self_bg){
                    self_bg.active = true;
                }
            }else{
                const self_bg = itemNode.getChildByName('bg');
                if(self_bg){
                    self_bg.active = false; // 非用户不显示背景
                }
            }

            this.leaderboardContent.addChild(itemNode);
            console.log(`Created leaderboard item ${displayPosition}: ${item.userId} (rank ${item.rank})`);

        } catch (error) {
            console.error(`Error creating leaderboard item ${displayPosition}:`, error);
        }
    }


    update(deltaTime: number) {
        // 更新剩余时间倒计时（使用RaceComp的数据）
        if (this.raceComp && this.raceComp.currentRace && this.timeLabel) {
            if (this.raceComp.currentRace.remainingTime > 0) {
                const remainingText = this.raceComp.formatRemainingTime(this.raceComp.currentRace.remainingTime);
                this.timeLabel.string = `${remainingText}`;
            } else {
                this.timeLabel.string = "Race Ended";
            }
        }
    }

    removeEvent() {
        // 清理事件监听
        if (this.closeButton) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        if(this.openDetailButton){
            this.openDetailButton.node.off(Button.EventType.CLICK, this.onShowDetailButtonClick, this);
        }

        if(this.closeDetailButton){
            this.closeDetailButton.node.off(Button.EventType.CLICK, this.onCloseDetailButtonClick, this);
        }
        
        oops.message.off("RACE_DATA_UPDATED", this.onRaceDataUpdated, this);
    }

    reset(): void {
        console.log("RaceUI reset");
        this.raceComp = null;
    }
}