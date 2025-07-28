# Requirements Document

## Introduction

基于 Oops Framework 开发的"Dog Crash"崩盘游戏，玩家控制小狗乘坐火箭飞行来获得倍数奖励。游戏采用简洁的界面设计，包含完整的用户系统、历史记录、排行榜和奖励机制。玩家需要在火箭崩盘前及时松开HOLD按钮以获得收益。游戏将使用 Cocos Creator 3.x 和 Oops Framework 架构进行开发。

## Requirements

### Requirement 1

**User Story:** 作为玩家，我希望能够在游戏开始前设置下注金额，以便参与游戏并有机会获得奖励

#### Acceptance Criteria

1. WHEN 玩家进入游戏主界面 THEN 系统 SHALL 显示下注输入框、当前余额、倍数显示和"HOLD"按钮
2. WHEN 玩家输入下注金额 THEN 系统 SHALL 验证金额是否在有效范围内（最小1，最大不超过余额）
3. WHEN 玩家输入无效金额 THEN 系统 SHALL 显示错误提示并禁用HOLD按钮
4. WHEN 玩家设置有效下注金额 THEN 系统 SHALL 启用HOLD按钮并显示绿色"HOLD"状态

### Requirement 2

**User Story:** 作为玩家，我希望游戏使用预定义的倍率表格来控制倍数增长和场景切换，以确保游戏的公平性和可预测性

#### Acceptance Criteria

1. WHEN 游戏初始化 THEN 系统 SHALL 加载预定义的倍率表格，包含时间点、对应的倍数值和Rocket状态三个字段
2. WHEN 玩家按住HOLD按钮 THEN 系统 SHALL 根据倍率表格计算当前时间对应的倍数，使用公式：Multiplier = 1 × e^(0.15 × t)
3. WHEN 当前时间在两个表格节点之间 THEN 系统 SHALL 使用指数插值计算精确倍数
4. WHEN 倍数计算完成 THEN 系统 SHALL 实时更新倍数显示和潜在收益（下注金额 × 当前倍数）
5. WHEN 系统检测到Rocket状态变化 THEN 系统 SHALL 根据倍率表格中的Rocket状态字段驱动场景切换
6. WHEN 系统需要验证倍数准确性 THEN 系统 SHALL 确保计算结果与策划文档Dog_Crash_Req.pdf中的倍率表格一致

### Requirement 3

**User Story:** 作为玩家，我希望看到根据倍率表格驱动的场景切换效果，以便获得更丰富的视觉体验

#### Acceptance Criteria

1. WHEN 系统读取倍率表格 THEN 系统 SHALL 解析每个时间点对应的Rocket状态（ground/sky/atmosphere/space）
2. WHEN Rocket状态从倍率表格中发生变化 THEN 系统 SHALL 触发对应的场景切换
3. WHEN 场景切换发生 THEN 系统 SHALL 无缝切换背景场景和前景场景
4. WHEN 相同Rocket状态持续 THEN 系统 SHALL 执行场景内的循环效果
5. WHEN 场景切换完成 THEN 系统 SHALL 发送场景切换事件供其他系统监听

### Requirement 4

**User Story:** 作为玩家，我希望通过按住HOLD按钮控制小狗火箭飞行并看到实时倍数变化和场景切换，以便了解当前的潜在收益和飞行高度

#### Acceptance Criteria

1. WHEN 玩家按住HOLD按钮 THEN 系统 SHALL 开始小狗火箭起飞动画并从倍率表格的起始倍数开始显示
2. WHEN 玩家持续按住HOLD按钮 THEN 系统 SHALL 根据倍率表格平滑增长倍数显示
3. WHEN 倍数变化时 THEN 系统 SHALL 实时更新潜在收益显示（下注金额 × 当前倍数）
4. WHEN 火箭飞行高度增加 THEN 系统 SHALL 同步更新小狗火箭在屏幕上的位置和动画
5. WHEN 倍率表格中的Rocket状态发生变化 THEN 系统 SHALL 无缝切换背景场景（ground→sky→atmosphere→space）
6. WHEN 玩家松开HOLD按钮 THEN 系统 SHALL 立即停止火箭飞行并进入提现流程

### Requirement 5

**User Story:** 作为玩家，我希望通过松开HOLD按钮来提现，以便在合适的时机获得收益

#### Acceptance Criteria

1. WHEN 玩家松开HOLD按钮且火箭未崩盘 THEN 系统 SHALL 立即停止倍数增长并计算最终收益
2. WHEN 提现成功 THEN 系统 SHALL 将收益添加到玩家余额并显示获胜动画
3. WHEN 提现后 THEN 系统 SHALL 显示本轮游戏结果（获得倍数和收益金额）
4. WHEN 游戏结束 THEN 系统 SHALL 重置界面并允许玩家开始下一轮游戏

### Requirement 5

**User Story:** 作为玩家，我希望看到分层的背景场景系统，包含背景层和前景层的视差滚动效果，以增强游戏的视觉体验和沉浸感

#### Acceptance Criteria

1. WHEN 游戏初始化 THEN 系统 SHALL 加载可扩展的场景配置数组，每个场景包含背景层预制体和前景层预制体
2. WHEN 场景资源组织 THEN 系统 SHALL 按照 assets/bundle/game/scenes/{sceneName}/{sceneName}_back.prefab 和 {sceneName}_front.prefab 的结构存储
3. WHEN 游戏运行时 THEN 系统 SHALL 实现背景层和前景层的视差滚动效果，前景层滚动速度更快以营造深度感
4. WHEN Rocket状态变化时 THEN 系统 SHALL 支持两种场景切换：场景间切换（不同场景）和场景内循环（相同场景的无缝循环）
5. WHEN 场景切换发生 THEN 系统 SHALL 同时切换背景层和前景层，并重置滚动偏移以实现无缝过渡
6. WHEN 场景系统扩展 THEN 系统 SHALL 支持通过配置数组轻松添加新场景，无需修改核心代码

### Requirement 6

**User Story:** 作为玩家，我希望游戏有公平的随机崩盘机制，以确保游戏的公正性

#### Acceptance Criteria

1. WHEN 玩家按住HOLD按钮时 THEN 系统 SHALL 使用加密安全的随机数生成崩盘点
2. WHEN 火箭达到预设崩盘点 THEN 系统 SHALL 立即触发崩盘动画并强制松开HOLD按钮
3. WHEN 火箭崩盘 THEN 系统 SHALL 显示爆炸效果和"CRASHED"提示
4. IF 火箭在玩家松开HOLD按钮前崩盘 THEN 系统 SHALL 扣除下注金额并显示失败结果

### Requirement 7

**User Story:** 作为玩家，我希望看到游戏历史记录，以便分析之前的游戏结果

#### Acceptance Criteria

1. WHEN 每轮游戏结束 THEN 系统 SHALL 记录游戏结果（崩盘倍数、是否提现、收益）
2. WHEN 玩家查看历史 THEN 系统 SHALL 显示最近20轮的游戏记录
3. WHEN 显示历史记录 THEN 系统 SHALL 包含时间、下注金额、崩盘倍数、提现倍数、收益信息
4. WHEN 玩家重新进入游戏 THEN 系统 SHALL 从本地存储加载历史记录

### Requirement 8

**User Story:** 作为玩家，我希望游戏有音效和视觉反馈，以增强游戏体验

#### Acceptance Criteria

1. WHEN 小狗火箭起飞 THEN 系统 SHALL 播放起飞音效和火箭尾焰粒子效果
2. WHEN 倍数增长 THEN 系统 SHALL 播放倍数变化音效和小狗动画
3. WHEN 玩家提现成功 THEN 系统 SHALL 播放胜利音效和金币动画
4. WHEN 火箭崩盘 THEN 系统 SHALL 播放爆炸音效、爆炸粒子效果和小狗坠落动画
5. WHEN 玩家点击按钮 THEN 系统 SHALL 提供触觉反馈（移动设备）

### Requirement 8

**User Story:** 作为玩家，我希望游戏支持多语言，以便不同地区的用户都能使用

#### Acceptance Criteria

1. WHEN 游戏启动 THEN 系统 SHALL 根据设备语言自动选择界面语言
2. WHEN 玩家切换语言 THEN 系统 SHALL 立即更新所有界面文本
3. WHEN 显示数字 THEN 系统 SHALL 根据当前语言使用正确的数字格式
4. WHEN 游戏支持语言包括 THEN 系统 SHALL 提供中文和英文支持

### Requirement 9

**User Story:** 作为玩家，我希望有简洁的用户界面显示基本信息，以便了解我的游戏状态

#### Acceptance Criteria

1. WHEN 玩家进入游戏 THEN 系统 SHALL 在顶部显示当前余额和用户标识
2. WHEN 玩家查看界面 THEN 系统 SHALL 显示清晰的倍数显示区域和下注控制区域
3. WHEN 游戏进行中 THEN 系统 SHALL 实时更新倍数显示和潜在收益
4. WHEN 界面布局 THEN 系统 SHALL 采用简洁的设计风格，突出核心游戏元素

### Requirement 10

**User Story:** 作为玩家，我希望能够查看历史记录，以便分析我的游戏表现

#### Acceptance Criteria

1. WHEN 玩家点击历史按钮 THEN 系统 SHALL 显示最近的游戏记录列表
2. WHEN 显示历史记录 THEN 系统 SHALL 包含每局的下注金额、崩盘倍数、是否获胜、收益等信息
3. WHEN 历史记录更新 THEN 系统 SHALL 自动保存到本地存储
4. WHEN 玩家重新进入游戏 THEN 系统 SHALL 从本地存储加载历史记录

### Requirement 11

**User Story:** 作为玩家，我希望能够查看排行榜，以便了解自己在所有玩家中的排名

#### Acceptance Criteria

1. WHEN 玩家查看排行榜 THEN 系统 SHALL 显示顶级玩家的排名列表
2. WHEN 显示排行榜 THEN 系统 SHALL 包含玩家头像、用户名、最高倍数、总收益等信息
3. WHEN 排行榜更新 THEN 系统 SHALL 实时或定期更新排名数据
4. WHEN 玩家查看自己排名 THEN 系统 SHALL 高亮显示当前玩家的位置

### Requirement 12

**User Story:** 作为玩家，我希望有简洁的导航功能，以便访问游戏的不同功能

#### Acceptance Criteria

1. WHEN 玩家点击导航按钮 THEN 系统 SHALL 显示相应的功能界面
2. WHEN 玩家在不同界面间切换 THEN 系统 SHALL 保持游戏状态的连续性
3. WHEN 显示功能界面 THEN 系统 SHALL 包含历史记录、排行榜、设置等核心功能
4. WHEN 玩家返回主界面 THEN 系统 SHALL 恢复游戏的主要控制界面

### Requirement 13

**User Story:** 作为玩家，我希望有加载界面和启动动画，以便在游戏启动时有良好的视觉体验

#### Acceptance Criteria

1. WHEN 游戏启动 THEN 系统 SHALL 显示带有游戏Logo的加载界面
2. WHEN 资源加载过程中 THEN 系统 SHALL 显示加载进度百分比和版本信息
3. WHEN 加载完成 THEN 系统 SHALL 播放启动动画并过渡到主游戏界面
4. WHEN 显示加载界面 THEN 系统 SHALL 包含小狗角色动画和火箭元素

### Requirement 14

**User Story:** 作为玩家，我希望游戏能够适配不同屏幕尺寸，以便在各种设备上正常游玩

#### Acceptance Criteria

1. WHEN 游戏在不同设备上运行 THEN 系统 SHALL 自动适配屏幕尺寸和比例
2. WHEN 屏幕方向改变 THEN 系统 SHALL 重新布局界面元素
3. WHEN 在小屏幕设备上 THEN 系统 SHALL 调整UI元素大小以确保可用性
4. WHEN 在大屏幕设备上 THEN 系统 SHALL 合理利用屏幕空间显示更多信息

### Requirement 15

**User Story:** 作为玩家，我希望有持久化的用户身份系统，以便在不同设备和会话间保持我的游戏数据

#### Acceptance Criteria

1. WHEN 玩家首次启动游戏 THEN 系统 SHALL 生成唯一的用户ID并持久化到本地存储
2. WHEN 玩家再次启动游戏 THEN 系统 SHALL 从本地存储读取用户ID并从服务器获取用户信息
3. WHEN 用户信息包含 THEN 系统 SHALL 存储用户名、最高倍率、最高倍率下的下注金额和赢取奖金
4. WHEN 玩家创造新的最高倍率记录 THEN 系统 SHALL 更新服务器端的用户信息
5. WHEN 本地存储的用户ID丢失 THEN 系统 SHALL 重新生成新的用户ID并创建新的用户档案

### Requirement 16

**User Story:** 作为玩家，我希望游戏使用服务器端的倍率表格和爆率数据，以确保游戏的公平性和一致性

#### Acceptance Criteria

1. WHEN 游戏启动时 THEN 系统 SHALL 从服务器获取当前的倍率表格数据
2. WHEN 倍率表格包含字段 THEN 系统 SHALL 包含时间点、倍率值和随机概率三个字段
3. WHEN 开始新游戏局 THEN 系统 SHALL 从服务器获取当前局的爆率（崩盘倍率）
4. WHEN 玩家在爆率之前松开HOLD按钮 THEN 系统 SHALL 计算为成功并给予奖金
5. WHEN 火箭达到爆率倍数 THEN 系统 SHALL 触发崩盘并结束当前游戏局
6. WHEN 服务器连接失败 THEN 系统 SHALL 使用本地缓存的倍率表格和随机生成的爆率继续游戏

### Requirement 17

**User Story:** 作为系统管理员，我希望有服务器端API来管理用户数据和游戏配置，以便维护游戏的正常运行

#### Acceptance Criteria

1. WHEN 客户端请求用户信息 THEN 服务器 SHALL 根据用户ID返回用户名、最高倍率、最高倍率下注金额和奖金
2. WHEN 客户端更新用户最高记录 THEN 服务器 SHALL 验证并更新用户的最高倍率记录
3. WHEN 客户端请求倍率表格 THEN 服务器 SHALL 返回包含时间点、倍率和概率的完整表格数据
4. WHEN 客户端请求新游戏局 THEN 服务器 SHALL 根据概率算法生成并返回当前局的爆率
5. WHEN 服务器需要更新游戏配置 THEN 系统 SHALL 支持动态更新倍率表格而无需客户端更新
