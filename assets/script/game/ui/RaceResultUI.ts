import { Node, Label, Button, _decorator, UIOpacity, tween, Vec3, Sprite } from 'cc';
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { smc } from "../common/SingletonModuleComp";
import { RaceComp, UserPrizeInfo } from '../comp/RaceComp';
import { UserDataComp } from '../comp/UserDataComp';
import { CrashGameAudio } from '../config/CrashGameAudio';

const { ccclass, property } = _decorator;

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
    second_username_label: Label = null!;
    
    @property(Label) 
    second_prize_label: Label = null!;
    
    @property(Label) 
    third_username_label: Label = null!;
    
    @property(Label) 
    third_prize_label: Label = null!;

    @property(Label)
    first_score_label: Label = null!;
    
    @property(Label)
    second_score_label: Label = null!;
    
    @property(Label)
    third_score_label: Label = null!;
    
    @property(Label)
    no_participation_label: Label = null!;

    // 底部消息区域
    @property(Node) 
    no_reward_node: Node = null!;
    
    @property(Node) 
    reward_node: Node = null!;
    
    // 用户奖励显示区域
    @property(Label)
    user_rank_label: Label = null!;
    
    @property(Label) 
    user_prize_amount_label: Label = null!;

     @property(Label) 
    user_score_label: Label = null!;
    
    @property(Button) 
    claim_prize_button: Button = null!;
    
    // 关闭按钮
    @property(Button) 
    close_button: Button = null!;

    private _close_callback: Function | null = null;
    private _current_race_id: string = "";
    private _current_user_prize: UserPrizeInfo | null = null;

    private _race:any = null;

    protected onLoad(): void {
        // 绑定按钮事件
        this.close_button.node.on('click', this.closePopup, this);
        this.claim_prize_button.node.on('click', this.onClaimPrize, this);
    }

    protected onDestroy(): void {
        if(this.close_button && this.close_button.node){
            this.close_button.node.off('click', this.closePopup, this);
        }
        if( this.claim_prize_button && this.claim_prize_button.node){
            this.claim_prize_button.node.off('click', this.onClaimPrize, this);
        }
    }

    /**
     * 响应显示比赛结果事件
     */
    public onOpen(params: any, callback: Function): void {
        this._race = params.race;
        this.showRaceResult(params.race.raceId, callback);
    }

    /**
     * 显示比赛结果
     * @param raceId 比赛ID
     * @param callback 关闭回调
     */
    public showRaceResult(raceId: string, callback?: Function): void {
        this._close_callback = callback || null;
        this._current_race_id = raceId;
        // this._race.racePrizes; //UserPrizeInfo[]
        console.log('Showing race result for race:', raceId);
        
        // 从 RaceComp 获取数据
        const raceComp = smc.crashGame?.get(RaceComp);
        if (!raceComp) {
            console.error('RaceComp not available');
            oops.gui.toast("Race data not available");
            return;
        }

        const userId = raceComp.getCurrentUserId();
        
        // 获取前三名和用户奖励
        const topThree = this._race.racePrizes?.filter((item:UserPrizeInfo) => item.rank <= 3) || [];
        const userPrize = this._race.racePrizes?.find((item:UserPrizeInfo) => item.userId == userId);
        this._current_user_prize = userPrize;
        
        this.updateDisplay(topThree, userPrize);
        this.playShowAnimation();
    }

    /**
     * 更新显示内容
     */
    private updateDisplay(topThree: UserPrizeInfo[], userPrize: UserPrizeInfo | null): void {
        // 显示前三名
        this.displayTopThree(topThree);
        
        // 根据用户是否获奖显示不同内容
        if (userPrize) {
            this.displayUserPrize(userPrize);
        } else {
            this.displayNoReward();
        }
    }

    /**
     * 显示前三名信息
     */
    private displayTopThree(topThree: UserPrizeInfo[]): void {
        const labels = [
            { username: this.first_username_label, prize: this.first_prize_label,score:this.first_score_label,node: this.first_place_node },
            { username: this.second_username_label, prize: this.second_prize_label ,score:this.second_score_label,node: this.second_place_node },
            { username: this.third_username_label, prize: this.third_prize_label ,score:this.third_score_label,node: this.third_place_node }
        ];
        
        labels.forEach((labelSet, index) => {
            if (index < topThree.length) {
                const player = topThree[index];
                const raceComp = smc.crashGame?.get(RaceComp);
                
                labelSet.username.string = raceComp ? raceComp.formatUserId(player.userId) : player.userId;
                labelSet.prize.string = raceComp ? raceComp.formatPrizeNumber(player.prizeAmount) : player.rank.toString();
                labelSet.score.string = raceComp.formatPrizeNumber(player.score);
                labelSet.node.active = true;
            } else {
                labelSet.node.active = false;
            }
        });

        if( topThree.length === 0 ){
            this.no_participation_label.node.active = true;
        }else{
            this.no_participation_label.node.active = false;
        }
    }

    /**
     * 显示用户奖励信息
     */
    private displayUserPrize(userPrize: UserPrizeInfo | null): void {
        if (!userPrize) {
            this.displayNoReward();
            return;
        }
        const raceComp = smc.crashGame?.get(RaceComp);
        const prizeText = raceComp ? raceComp.formatPrizeNumber(userPrize.prizeAmount) : userPrize.prizeAmount.toString();
        this.user_rank_label.string = `${userPrize.rank}`;
        this.user_prize_amount_label.string = prizeText;
        this.user_score_label.string =raceComp.formatPrizeNumber(userPrize.userNetProfit);
        
        // 根据奖励状态设置按钮
        if( userPrize.status == 'claimed' ){
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLOSE';
        }
        else{
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIM';
        }
        
    }

    /**
     * 显示无奖励信息
     */
    private displayNoReward(): void {
        this.no_reward_node.active = true;
        this.reward_node.active = false;
        this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLOSE';
    }

    /**
     * 领取奖励按钮点击事件
     */
    private async onClaimPrize(): Promise<void> {
        console.log('Claim prize button clicked');
        
        if (!this._current_user_prize) {
            console.error('No prize to claim');
            this.closePopup();
            return;
        }

        if(this._current_user_prize.status == 'claimed') {
            console.log('Prize already claimed');
            this.closePopup();
            return;
        }

        try {
            // 禁用按钮防止重复点击
            this.claim_prize_button.interactable = false;
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLAIMING...';
            
            // 使用 RaceComp 领取奖励
            const raceComp = smc.crashGame?.get(RaceComp);
            if (!raceComp) {
                throw new Error('RaceComp not available');
            }
            
            const success = await raceComp.claimPrize(this._current_user_prize._id);
            
            if (success) {
                this.claim_prize_button.node.active = false;
                // this.bottom_message_label.string = `REWARD CLAIMED!\nCOINS ADDED TO YOUR BALANCE!`;
                CrashGameAudio.playCashOutSuccess(); // 播放成功音效
                this._current_user_prize = null;
            } else {
                throw new Error('Failed to claim prize');
            }
            
        } catch (error) {
            console.error('Error claiming prize:', error);
            this.claim_prize_button.interactable = true;
            this.claim_prize_button.getComponentInChildren(Label)!.string = 'CLOSE';
            oops.gui.toast("Failed to claim reward");
        }
        this.closePopup();
    }


    // === 动画方法 ===
    
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
            .call(() => {})
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
        CrashGameAudio.playButtonClick();
        
        // 播放隐藏动画
        this.playHideAnimation(() => {
            if (this._close_callback) {
                this._close_callback();
            }
        });
    }

    /**
     * 重置组件状态 - CCComp抽象方法实现
     */
    reset(): void {
        this.node.active = false;
        this.claim_prize_button.node.active = false;
        this._close_callback = null;
        this._current_race_id = "";
        this._current_user_prize = null;
    }
}