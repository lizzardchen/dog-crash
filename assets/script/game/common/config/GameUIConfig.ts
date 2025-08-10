/*
 * @Date: 2021-08-12 09:33:37
 * @LastEditors: dgflash
 * @LastEditTime: 2023-02-15 09:38:36
 */

import { LayerType, UIConfig } from "db://oops-framework/core/gui/layer/LayerManager";


/** 界面唯一标识（方便服务器通过编号数据触发界面打开） */
export enum UIID {
    /** 资源加载界面 */
    Loading = 1,
    /** 提示弹出窗口 */
    Alert,
    /** 确认弹出窗口 */
    Confirm,
    /** 主游戏界面 */
    MainGame,
    /** 侧边菜单 */
    SideMenu,
    /** 用户账户界面 */
    Account,
    /** 奖励兑换界面 */
    Reward,
    /** 排行榜界面 */
    Leaderboard,
    /** 设置界面 */
    Settings,
    /** 游戏结果界面 */
    GameResult,
    /** 崩盘游戏主界面 */
    CrashGame,
    /** 自动提现界面 */
    AutoCashOut,
    /** 比赛界面 */
    Race,
    /**比赛领奖 */
    RaceReward,
    /** 用户资料界面 */
    UserProfile,
    /** 游戏规则界面 */
    GameRules,
    /** 联系我们界面 */
    ContactUs,
    /** 条款说明界面 */
    TermsConditions,
    /** 新手引导弹窗 */
    TutorialPopup,
    /** 金币弹窗 */
    GoldPopup,
    /** money弹窗 */
    MoneyPopup
}

/** 打开界面方式的配置数据 */
export var UIConfigData: { [key: number]: UIConfig } = {
    [UIID.Loading]: { layer: LayerType.UI, prefab: "gui/loading/loading" },
    [UIID.Alert]: { layer: LayerType.Dialog, prefab: "common/prefab/alert" },
    [UIID.Confirm]: { layer: LayerType.Dialog, prefab: "common/prefab/confirm" },
    [UIID.SideMenu]: { layer: LayerType.PopUp, prefab: "gui/crash/side_menu" },
    [UIID.Account]: { layer: LayerType.UI, prefab: "gui/crash/account" },
    [UIID.Reward]: { layer: LayerType.UI, prefab: "gui/crash/reward" },
    [UIID.Leaderboard]: { layer: LayerType.UI, prefab: "gui/crash/leaderboard" },
    [UIID.Settings]: { layer: LayerType.Dialog, prefab: "gui/crash/settings" },
    [UIID.GameResult]: { layer: LayerType.Dialog, prefab: "gui/crash/game_result" },
    [UIID.CrashGame]: { layer: LayerType.UI, prefab: "gui/crash/game" },
    [UIID.AutoCashOut]: { layer: LayerType.Dialog, prefab: "gui/crash/auto_cashout" },
    [UIID.Race]: { layer: LayerType.Dialog, prefab: "gui/crash/race" },
    [UIID.RaceReward]: { layer: LayerType.Dialog, prefab: "gui/crash/race_reward" },
    [UIID.UserProfile]: { layer: LayerType.Dialog, prefab: "gui/crash/user_profile" },
    [UIID.GameRules]: { layer: LayerType.Dialog, prefab: "gui/crash/game_rules" },
    [UIID.ContactUs]: { layer: LayerType.Dialog, prefab: "gui/crash/contact_us" },
    [UIID.TermsConditions]: { layer: LayerType.Dialog, prefab: "gui/crash/terms_conditions" },
    [UIID.TutorialPopup]: { layer: LayerType.Dialog, prefab: "gui/crash/tutorial_popup" },
    [UIID.GoldPopup]: { layer: LayerType.Dialog, prefab: "gui/crash/gold_popup" },
    [UIID.MoneyPopup]: { layer: LayerType.Dialog, prefab: "gui/crash/money_popup" },
}