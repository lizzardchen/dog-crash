import { Node, Label, Button, Sprite, _decorator, UIOpacity, tween, Vec3 } from 'cc';
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";

const { ccclass, property } = _decorator;

// 比赛结果数据接口
export interface RaceResultData {
    raceId: string;
    topThree: LeaderboardEntry[];
    userPrize?: UserPrizeInfo;
    userRank?: number;
    totalParticipants: number;
}

export interface LeaderboardEntry {
    userId: string;
    username?: string;
    rank: number;
    netProfit: number;
    prizeAmount?: number;
}

export interface UserPrizeInfo {
    prizeId: string;
    rank: number;
    prizeAmount: number;
    status: 'pending' | 'claimed';
}

/**
 * 比赛结果弹窗UI组件
 * 显示比赛结束后的前三名和用户奖励信息
 */
@ccclass('RaceResultUI')
@ecs.register('RaceResultUI', false)
export class RaceResultUI extends CCComp {
    @property(UIOpacity) 
    bg_opacity: UIOpacity = null!;
    
    @property(Node) 
    content_node: Node = null!;
    
    // 前三名显示节点
    @property(Node) 
    first_place_node: Node = null!;
    
    @property(Node) 
    second_place_node: Node = null!;
    
    @property(Node) 
    third_place_node: Node = null!;
    
    // 前三名信息标签
    @property(Label) 
    first_username_label: Label = null!;
    
    @property(Label) 
    first_prize_label: Label = null!;
    
    @property(Label) 
    first_points_label: Label = null!;
    
    @property(Label) 
    second_username_label: Label = null!;
    
    @property(Label) 
    second_prize_label: Label = null!;
    
    @property(Label) 
    second_points_label: Label = null!;
    
    @property(Label) 
    third_username_label: Label = null!;
    
    @property(Label) 
    third_prize_label: Label = null!;
    
    @property(Label) 
    third_points_label: Label = null!;
    
    // 底部消息区域
    @property(Node) 
    bottom_message_node: Node = null!;
    
    @property(Label) 
    bottom_message_label: Label = null!;
    
    // 用户奖励显示区域
    @property(Node) 
    user_prize_node: Node = null!;
    
    @property(Label) 
    user_prize_amount_label: Label = null!;
    
    @property(Button) 
    claim_prize_button: Button = null!;
    
    // 关闭按钮
    @property(Button) 
    close_button: Button = null!;

    private _raceData: RaceResultData | null = null;
    private _close_callback: Function | null = null;

    protected onLoad(): void {
        // 绑定按钮事件
        this.close_button.node.on('click', this.closePopup, this);
        this.claim_prize_button.node.on('click', this.onClaimPrize, this);
        
        // 初始化状态
        this.resetUI();
    }

    protected onDestroy(): void {
        this.close_button.node.off('click', this.closePopup, this);
        this.claim_prize_button.node.off('click', this.onClaimPrize, this);
    }

    /**
     * 打开比赛结果弹窗
     * @param raceData 比赛结果数据
     * @param callback 关闭回调
     */
    public showRaceResult(raceData: RaceResultData, callback?: Function): void {
        this._raceData = raceData;
        this._close_callback = callback;
        
        console.log('Showing race result:', raceData);
        
        // 显示弹窗
        this.node.active = true;
        
        // 更新UI显示
        this.updateRaceResultDisplay();
        
        // 播放弹窗动画
        this.playShowAnimation();
    }

    /**
     * 更新比赛结果显示
     */
    private updateRaceResultDisplay(): void {
        if (!this._raceData) return;

        // 显示前三名
        this.displayTopThree();
        
        // 根据用户是否获奖显示不同内容
        if (this._raceData.userPrize) {
            this.displayUserPrize();
        } else {
            this.displayNoReward();
        }
    }

    /**
     * 显示前三名信息
     */
    private displayTopThree(): void {
        const topThree = this._raceData!.topThree;
        
        // 显示第一名
        if (topThree.length > 0) {
            const first = topThree[0];
            this.first_username_label.string = first.username || this.generateDisplayName(first.userId);
            this.first_prize_label.string = this.formatPrize(first.prizeAmount || 0);
            this.first_points_label.string = `RANK POINTS: ${this.formatNumber(first.netProfit)}`;
            this.first_place_node.active = true;
        } else {
            this.first_place_node.active = false;
        }
        
        // 显示第二名
        if (topThree.length > 1) {
            const second = topThree[1];
            this.second_username_label.string = second.username || this.generateDisplayName(second.userId);
            this.second_prize_label.string = this.formatPrize(second.prizeAmount || 0);
            this.second_points_label.string = `RANK POINTS: ${this.formatNumber(second.netProfit)}`;
            this.second_place_node.active = true;
        } else {
            this.second_place_node.active = false;
        }
        
        // 显示第三名
        if (topThree.length > 2) {
            const third = topThree[2];
            this.third_username_label.string = third.username || this.generateDisplayName(third.userId);
            this.third_prize_label.string = this.formatPrize(third.prizeAmount || 0);
            this.third_points_label.string = `RANK POINTS: ${this.formatNumber(third.netProfit)}`;
            this.third_place_node.active = true;
        } else {
            this.third_place_node.active = false;
        }
    }

    /**
     * 显示用户奖励信息
     */
    private displayUserPrize(): void {
        const userPrize = this._raceData!.userPrize!;
        
        // 检查用户是否在前三名
        const isInTopThree = this._raceData!.topThree.some(entry => 
            entry.rank === userPrize.rank
        );
        
        if (isInTopThree) {
            // 用户在前三名，隐藏底部消息
            this.bottom_message_node.active = false;
            this.user_prize_node.active = false;
        } else {
            // 用户不在前三名但有奖励，显示恭喜消息和领取按钮
            this.bottom_message_node.active = true;
            this.user_prize_node.active = true;
            
            this.bottom_message_label.string = `CONGRATULATIONS!\nYOU WON ${this.formatPrize(userPrize.prizeAmount)} COINS!`;
            this.user_prize_amount_label.string = this.formatPrize(userPrize.prizeAmount);
            
            // 根据奖励状态设置按钮
            if (userPrize.status === 'pending') {
                this.claim_prize_button.node.active = true;
                this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIM REWARD';
            } else {
                this.claim_prize_button.node.active = false;
            }
        }
    }

    /**
     * 显示无奖励信息
     */
    private displayNoReward(): void {
        this.bottom_message_node.active = true;
        this.user_prize_node.active = false;
        
        this.bottom_message_label.string = `YOU DIDN'T GET IN THE MONEY\nBETTER LUCK NEXT TIME!`;
    }

    /**
     * 领取奖励按钮点击事件
     */
    private async onClaimPrize(): void {
        if (!this._raceData?.userPrize) return;
        
        const userPrize = this._raceData.userPrize;
        
        try {
            // 禁用按钮防止重复点击
            this.claim_prize_button.interactable = false;
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIMING...';
            
            // 调用奖励领取API
            const success = await this.claimPrizeFromServer(userPrize.prizeId);
            
            if (success) {
                // 领取成功，更新UI
                this.claim_prize_button.node.active = false;
                this.bottom_message_label.string = `REWARD CLAIMED!\n${this.formatPrize(userPrize.prizeAmount)} COINS ADDED TO YOUR BALANCE!`;
                
                // 播放成功音效
                oops.audio.playEffect("audio/cash_out_success");
                
                console.log(`Prize claimed successfully: ${userPrize.prizeAmount} coins`);
            } else {
                // 领取失败，恢复按钮状态
                this.claim_prize_button.interactable = true;
                this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIM REWARD';
                
                // 显示错误消息
                oops.gui.toast("Failed to claim reward. Please try again.");
            }
            
        } catch (error) {
            console.error('Error claiming prize:', error);
            
            // 恢复按钮状态
            this.claim_prize_button.interactable = true;
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIM REWARD';
            
            oops.gui.toast("Network error. Please try again.");
        }
    }

    /**
     * 从服务器领取奖励
     */
    private async claimPrizeFromServer(prizeId: string): Promise<boolean> {
        try {
            // 获取用户ID（这里需要根据你的用户系统获取）
            const userId = this.getCurrentUserId();
            
            const response = await fetch(`/api/race/prizes/${prizeId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // TODO: 更新本地用户余额
                // await this.updateLocalBalance(data.data.prizeAmount);
                return true;
            } else {
                console.error('Server error claiming prize:', data.message);
                return false;
            }
            
        } catch (error) {
            console.error('Network error claiming prize:', error);
            return false;
        }
    }

    /**
     * 获取当前用户ID
     * TODO: 根据实际的用户系统实现
     */
    private getCurrentUserId(): string {
        // 这里需要根据你的用户系统获取当前用户ID
        // 可能从UserDataComp或本地存储中获取
        return "current_user_id";
    }

    /**
     * 生成用户显示名称
     */
    private generateDisplayName(userId: string): string {
        // 截取userId的前8位作为显示名称
        return userId.length > 8 ? userId.substring(0, 8) : userId;
    }

    /**
     * 格式化奖励金额显示
     */
    private formatPrize(amount: number): string {
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
    }

    /**
     * 格式化数字显示
     */
    private formatNumber(num: number): string {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}K`;
        }
        return num.toFixed(0);
    }

    /**
     * 播放弹窗显示动画
     */
    private playShowAnimation(): void {
        // 初始状态
        this.bg_opacity.opacity = 0;
        this.content_node.setScale(0.8, 0.8, 1);
        
        // 背景淡入动画
        tween(this.bg_opacity)
            .to(0.3, { opacity: 200 })
            .start();
        
        // 内容弹出动画
        tween(this.content_node)
            .to(0.3, { scale: new Vec3(1, 1, 1) })
            .easing('backOut')
            .start();
    }

    /**
     * 播放弹窗隐藏动画
     */
    private playHideAnimation(callback?: Function): void {
        // 背景淡出动画
        tween(this.bg_opacity)
            .to(0.2, { opacity: 0 })
            .start();
        
        // 内容缩小动画
        tween(this.content_node)
            .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
            .call(() => {
                this.node.active = false;
                callback && callback();
            })
            .start();
    }

    /**
     * 关闭弹窗
     */
    private closePopup(): void {
        // 播放关闭音效
        oops.audio.playEffect("audio/button_click");
        
        // 播放隐藏动画
        this.playHideAnimation(() => {
            if (this._close_callback) {
                this._close_callback();
            }
        });
    }

    /**
     * 重置UI状态
     */
    private resetUI(): void {
        this.node.active = false;
        this.bottom_message_node.active = false;
        this.user_prize_node.active = false;
        this.claim_prize_button.node.active = false;
    }

    /**
     * 静态方法：显示比赛结果弹窗
     */
    public static async showRaceResult(raceId: string, userId: string): Promise<void> {
        try {
            console.log(`Loading race result for race: ${raceId}, user: ${userId}`);
            
            // 获取比赛排行榜前三名
            const leaderboardResponse = await fetch(`/api/race/${raceId}/leaderboard?limit=3&userId=${userId}`);
            const leaderboardData = await leaderboardResponse.json();
            
            if (!leaderboardData.success) {
                console.error('Failed to load leaderboard:', leaderboardData.message);
                return;
            }
            
            // 获取用户的奖励信息
            const prizesResponse = await fetch(`/api/race/prizes/user/${userId}`);
            const prizesData = await prizesResponse.json();
            
            // 查找该比赛的奖励
            let userPrize: UserPrizeInfo | undefined;
            if (prizesData.success && prizesData.data.pendingPrizes) {
                const raceReward = prizesData.data.pendingPrizes.find((prize: any) => prize.raceId === raceId);
                if (raceReward) {
                    userPrize = {
                        prizeId: raceReward._id,
                        rank: raceReward.rank,
                        prizeAmount: raceReward.prizeAmount,
                        status: raceReward.status
                    };
                }
            }
            
            // 构建比赛结果数据
            const raceResultData: RaceResultData = {
                raceId: raceId,
                topThree: leaderboardData.data.topLeaderboard.map((entry: any) => ({
                    userId: entry.userId,
                    username: entry.username,
                    rank: entry.rank,
                    netProfit: entry.netProfit,
                    prizeAmount: entry.prizeAmount // 如果服务器返回奖励金额
                })),
                userPrize: userPrize,
                userRank: leaderboardData.data.userInfo?.rank,
                totalParticipants: leaderboardData.data.totalParticipants || 0
            };
            
            // 使用oops.gui显示弹窗
            const raceResultUI = await oops.gui.open("gui/race/RaceResultUI") as RaceResultUI;
            if (raceResultUI) {
                raceResultUI.showRaceResult(raceResultData);
            }
            
        } catch (error) {
            console.error('Error showing race result:', error);
            oops.gui.toast("Failed to load race results");
        }
    }
}