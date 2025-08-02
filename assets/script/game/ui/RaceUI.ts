import { _decorator, Node, Label, Button, instantiate, Prefab, Color, Sprite, ScrollView } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { smc } from "../common/SingletonModuleComp";
import { UserDataComp } from '../comp/UserDataComp';
import { CrashGameAudio } from "../config/CrashGameAudio";
import { UIID } from "../common/config/GameUIConfig";
import { CrashGame } from '../entity/CrashGame';

const { ccclass, property } = _decorator;

/**
 * 比赛排行榜项目接口
 */
interface RaceLeaderboardItem {
    rank: number;
    userId: string;
    netProfit: number;
    totalBetAmount: number;
    sessionCount: number;
}

/**
 * 比赛信息接口
 */
interface RaceInfo {
    raceId: string;
    startTime: string;
    endTime: string;
    remainingTime: number;
    status: string;
    prizePool: {
        totalPool: number;
        contributedAmount: number;
        participants: number;
        shouldDistributePrizes: boolean;
    };
}

/**
 * 用户比赛信息接口
 */
interface UserRaceInfo {
    rank: number;
    displayRank: number;
    netProfit: number;
    sessionCount: number;
    contribution: number;
}

@ccclass('RaceUI')
@ecs.register('RaceUI', false)
export class RaceUI extends CCComp {
    // 顶部信息
    @property(Label)
    titleLabel: Label = null!;

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

    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;

    private updateTimer: number = 0;
    private readonly UPDATE_INTERVAL = 5000; // 5秒更新一次
    private currentRaceInfo: RaceInfo | null = null;

    onLoad() {
        console.log("RaceUI loaded");
        
        // 设置事件监听
        this.setupEvents();
        
        // 开始获取比赛数据
        this.fetchRaceData();
    }

    private setupEvents(): void {
        // 关闭按钮
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
    }

    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Race close button clicked");
        
        // 关闭整个UI界面
        oops.gui.remove(UIID.Race);
    }

    /**
     * 获取比赛数据
     */
    private async fetchRaceData(): Promise<void> {
        try {
            // 获取当前比赛信息
            const raceResponse = await this.fetchCurrentRace();
            if (!raceResponse.success || !raceResponse.data.hasActiveRace) {
                this.displayNoActiveRace();
                return;
            }
            
            this.currentRaceInfo = raceResponse.data.race;
            
            // 获取用户ID
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.warn("No user ID available");
                return;
            }
            
            // 获取排行榜和用户信息
            const leaderboardResponse = await this.fetchRaceLeaderboard(
                this.currentRaceInfo.raceId, 
                11, // 获取前11名
                userId
            );
            
            if (leaderboardResponse.success) {
                // 更新UI显示
                this.updateDisplay(this.currentRaceInfo, leaderboardResponse.data.topLeaderboard, leaderboardResponse.data.userInfo);
            }
            
        } catch (error) {
            console.error("Failed to fetch race data:", error);
        }
    }

    /**
     * 获取当前比赛信息的API调用
     */
    private async fetchCurrentRace(): Promise<any> {
        const response = await fetch(`${CrashGame.serverConfig.baseURL}race/current`);
        return await response.json();
    }

    /**
     * 获取比赛排行榜的API调用
     */
    private async fetchRaceLeaderboard(raceId: string, limit: number, userId: string): Promise<any> {
        const response = await fetch(`${CrashGame.serverConfig.baseURL}race/${raceId}/leaderboard?limit=${limit}&userId=${userId}`);
        return await response.json();
    }

    /**
     * 获取当前用户ID
     */
    private getCurrentUserId(): string | null {
        if (!smc.crashGame) return null;
        
        const userData = smc.crashGame.get(UserDataComp);
        if (userData && userData.userId) {
            return userData.userId;
        }
        
        // 如果没有UserDataComp，尝试生成一个临时ID
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Generated temporary user ID: ${tempUserId}`);
        return tempUserId;
    }

    /**
     * 显示没有活跃比赛的状态
     */
    private displayNoActiveRace(): void {
        if (this.titleLabel) {
            this.titleLabel.string = "BLAST-OFF!\nRACES";
        }
        if (this.timeLabel) {
            this.timeLabel.string = "No active race";
        }
        if (this.prizePoolLabel) {
            this.prizePoolLabel.string = "PRIZE POOL: 🪙 0 MSAT";
        }
        
        // 清空前三名显示
        this.clearPodiumDisplay();
        
        // 清空排行榜
        if (this.leaderboardContent) {
            this.leaderboardContent.removeAllChildren();
        }
    }

    /**
     * 更新所有显示信息
     */
    private updateDisplay(raceInfo: RaceInfo, leaderboard: RaceLeaderboardItem[], userInfo: UserRaceInfo): void {
        // 更新标题
        if (this.titleLabel) {
            this.titleLabel.string = "BLAST-OFF!\nRACES";
        }

        // 更新剩余时间
        if (this.timeLabel) {
            const remainingText = this.formatRemainingTime(raceInfo.remainingTime);
            this.timeLabel.string = `RACE ENDS IN: ${remainingText}`;
        }

        // 更新奖池
        if (this.prizePoolLabel) {
            const prizeText = this.formatPrizePool(raceInfo.prizePool.totalPool);
            this.prizePoolLabel.string = `PRIZE POOL: 🪙 ${prizeText} MSAT`;
        }

        // 更新前三名奖牌显示
        this.updatePodium(leaderboard.slice(0, 3));
        
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
        const nameLabel = node.getChildByName("NameLabel")?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = this.formatUserId(item.userId);
        }
        
        // 设置收益
        const profitLabel = node.getChildByName("ProfitLabel")?.getComponent(Label);
        if (profitLabel) {
            const profitText = this.formatPrizeNumber(item.netProfit);
            profitLabel.string = `🏆 ${profitText}`;
            
            // 根据盈亏设置颜色
            if (item.netProfit > 0) {
                profitLabel.color = new Color(255, 215, 0, 255); // 金色
            } else if (item.netProfit < 0) {
                profitLabel.color = new Color(255, 100, 100, 255); // 红色
            } else {
                profitLabel.color = new Color(255, 255, 255, 255); // 白色
            }
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
    private updateLeaderboard(leaderboard: RaceLeaderboardItem[], userInfo: UserRaceInfo): void {
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
        if (userInfo.rank > 11) {
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

            // 设置排名
            const rankLabel = itemNode.getChildByName("RankLabel")?.getComponent(Label);
            if (rankLabel) {
                rankLabel.string = item.rank.toString();
            }

            // 设置用户名
            const nameLabel = itemNode.getChildByName("NameLabel")?.getComponent(Label);
            if (nameLabel) {
                nameLabel.string = isUser ? "YOU" : this.formatUserId(item.userId);
            }

            // 设置收益
            const reward_node = itemNode.getChildByName("reward") as Node;
            const profitLabel = reward_node.getChildByName("ProfitLabel")?.getComponent(Label);
            if (profitLabel) {
                const profitText = this.formatPrizeNumber(item.netProfit);
                profitLabel.string = `🏆 ${profitText}`;
                
                // 根据盈亏设置颜色
                if (item.netProfit > 0) {
                    profitLabel.color = new Color(255, 215, 0, 255); // 金色
                } else if (item.netProfit < 0) {
                    profitLabel.color = new Color(255, 100, 100, 255); // 红色
                } else {
                    profitLabel.color = new Color(255, 255, 255, 255); // 白色
                }
            }

            // 如果是用户自己，设置特殊背景色
            if (isUser) {
                const bgSprite = itemNode.getComponent(Sprite);
                if (bgSprite) {
                    bgSprite.color = new Color(255, 255, 0, 100); // 半透明黄色
                }
            }

            this.leaderboardContent.addChild(itemNode);
            console.log(`Created leaderboard item ${displayPosition}: ${item.userId} (rank ${item.rank})`);

        } catch (error) {
            console.error(`Error creating leaderboard item ${displayPosition}:`, error);
        }
    }

    /**
     * 格式化奖池数字显示（参考界面样式）
     */
    private formatPrizePool(value: number): string {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(0)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        } else {
            // 添加千位分隔符
            return value.toLocaleString();
        }
    }

    /**
     * 格式化奖励数字显示（用于排行榜收益显示）
     */
    private formatPrizeNumber(value: number): string {
        const absValue = Math.abs(value);
        if (absValue >= 1000000) {
            const formatted = `${(absValue / 1000000).toFixed(2)}M`;
            return value < 0 ? `-${formatted}` : formatted;
        } else if (absValue >= 1000) {
            const formatted = `${(absValue / 1000).toFixed(2)}K`;
            return value < 0 ? `-${formatted}` : formatted;
        } else {
            return value.toFixed(2);
        }
    }

    /**
     * 格式化剩余时间
     */
    private formatRemainingTime(milliseconds: number): string {
        if (milliseconds <= 0) return "00:00:00";
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }


    /**
     * 格式化用户ID显示
     */
    private formatUserId(userId: string): string {
        if (userId.length > 8) {
            return userId.substring(0, 6) + "...";
        }
        return userId;
    }

    update(deltaTime: number) {
        // 定期更新比赛数据
        this.updateTimer += deltaTime * 1000; // 转换为毫秒
        
        if (this.updateTimer >= this.UPDATE_INTERVAL) {
            this.updateTimer = 0;
            this.fetchRaceData();
        }

        // 更新剩余时间倒计时
        if (this.currentRaceInfo && this.timeLabel) {
            this.currentRaceInfo.remainingTime -= deltaTime * 1000;
            if (this.currentRaceInfo.remainingTime > 0) {
                const remainingText = this.formatRemainingTime(this.currentRaceInfo.remainingTime);
                this.timeLabel.string = `RACE ENDS IN: ${remainingText}`;
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
    }

    reset(): void {
        console.log("RaceUI reset");
        this.currentRaceInfo = null;
        this.updateTimer = 0;
    }
}