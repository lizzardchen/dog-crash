import { _decorator, Component, Node, Sprite, Vec3, input, Input, EventTouch, UITransform, Prefab, instantiate } from 'cc';
import { LevelNodeCell } from './LevelNodeCell';
const { ccclass, property } = _decorator;

@ccclass('LevelSelUI')
export class LevelSelUI extends Component {

    @property([Sprite])
    bgNodes:Sprite[] = [];//3张背景图，需要123123123这样形式的进行拼接

    @property([Node])
    paths:Node[] = []; //100个

    @property([LevelNodeCell])
    levelCells:LevelNodeCell[] = []; //100个

    @property(Prefab)
    levelCellPrefab: Prefab = null!; // 关卡预制体

    @property(Node)
    levelContainer: Node = null!; // 关卡容器节点

    private bgHeights: number[] = []; // 每张背景图的高度
    private totalScrollHeight: number = 0; // 总滚动高度
    private scrollY: number = 0; // 当前滚动位置
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private lastTouchPos: Vec3 = new Vec3();
    private centerY: number = 0; // LevelSelUI中心的Y坐标
    private baseCenters: number[] = []; // 每张图的基准中心位置

    // 关卡相关属性
    private levelHeight: number = 400; // 每个关卡的高度
    private startOffset: number = 500; // 第一个关卡相对于底边的起始偏移
    private levelCount: number = 100; // 总关卡数
    private levelNodes: Node[] = []; // 关卡节点数组
    private levelPositions: number[] = []; // 关卡Y坐标数组
    private visibleLevels: Set<number> = new Set(); // 当前可见的关卡索引
    private screenHeight: number = 1920; // 屏幕高度

    start() {
        this.scheduleOnce(()=>{
            this.init();
        },0.1);
    }

    private init(){
        this.initLevels();
        this.initBgNodes();
        this.setupTouchEvents();
    }

    private initBgNodes() {
        if (this.bgNodes.length !== 3) {
            console.error('bgNodes数组必须包含3个Sprite节点');
            return;
        }

        // 获取每张背景图的高度
        this.bgHeights = [];
        for (let i = 0; i < this.bgNodes.length; i++) {
            const nodeTransform = this.bgNodes[i].node.getComponent(UITransform);
            if (nodeTransform) {
                this.bgHeights[i] = nodeTransform.height;
            } else {
                this.bgHeights[i] = 1920;
            }
        }

        // 计算基准中心位置（以第一张图中心为0）
        this.baseCenters = [this.bgHeights[0]/2-this.screenHeight/2]; // 第一张图中心为0
        this.baseCenters[1] = this.baseCenters[0] + this.bgHeights[0] / 2 + this.bgHeights[1] / 2; // 第二张图中心
        this.baseCenters[2] = this.baseCenters[1] + this.bgHeights[1] / 2 + this.bgHeights[2] / 2; // 第三张图中心

        // 计算关卡总高度并设置背景滚动高度
        const levelTotalHeight = this.levelCount * this.levelHeight + this.startOffset;
        this.totalScrollHeight = levelTotalHeight;

        // 初始化scrollY为0（第一张图在中心）
        this.scrollY = 0;

        // 更新初始位置
        this.updateBgPositionsByScroll();
    }

    private initLevels() {
        if (!this.levelCellPrefab || !this.levelContainer) {
            console.error('levelCellPrefab 或 levelContainer 未设置');
            return;
        }

        this.screenHeight = this.node.h;

        // 计算每个关卡的Y坐标位置
        this.levelPositions = [];
        for (let i = 0; i < this.levelCount; i++) {
            // 关卡从下往上排列：关卡1在最下方，关卡100在最上方
            const levelY = this.startOffset + i * this.levelHeight -this.screenHeight/2;
            this.levelPositions[i] = levelY;
        }

        // 创建关卡节点数组（初始为空）
        this.levelNodes = new Array(this.levelCount).fill(null);
        this.levelCells = [];

        // 初始化可见关卡
        this.updateVisibleLevels();
    }

    private updateBgPositionsByScroll() {
        // 钳制scrollY在有效范围内
        this.scrollY = Math.max(0, Math.min(this.scrollY, this.totalScrollHeight));

        for (let i = 0; i < this.bgNodes.length; i++) {
            // 计算位置：y = baseCenters[i] - scrollY
            let y = this.baseCenters[i] - this.scrollY;
            this.bgNodes[i].node.setPosition(0, y, 0);
        }

        // 检查并重新排列背景图实现无缝循环
        this.checkAndRearrangeBg();

        // 更新关卡可见性
        this.updateVisibleLevels();
    }

    private updateVisibleLevels() {
        // 计算当前可见区域
        const visibleTop = this.scrollY + this.screenHeight / 2;
        const visibleBottom = this.scrollY - this.screenHeight / 2;

        // 计算可见关卡范围（添加缓冲区）
        const buffer = this.levelHeight * 2; // 缓冲区
        const startIndex = Math.max(0, Math.floor((visibleBottom - this.startOffset - buffer) / this.levelHeight));
        const endIndex = Math.min(this.levelCount - 1, Math.ceil((visibleTop - this.startOffset + buffer) / this.levelHeight));

        // 新的可见关卡集合
        const newVisibleLevels = new Set<number>();
        for (let i = startIndex; i <= endIndex; i++) {
            newVisibleLevels.add(i);
        }

        // 隐藏不再可见的关卡
        for (const levelIndex of this.visibleLevels) {
            if (!newVisibleLevels.has(levelIndex)) {
                this.hideLevelNode(levelIndex);
            }
        }

        // 显示新可见的关卡
        for (const levelIndex of newVisibleLevels) {
            if (!this.visibleLevels.has(levelIndex)) {
                this.showLevelNode(levelIndex);
            }
        }

        this.visibleLevels = newVisibleLevels;
    }

    private showLevelNode(levelIndex: number) {
        if (levelIndex < 0 || levelIndex >= this.levelCount) return;

        // 如果节点不存在，创建它
        if (!this.levelNodes[levelIndex]) {
            const levelNode = instantiate(this.levelCellPrefab);
            const levelCell = levelNode.getComponent(LevelNodeCell);
            if (levelCell) {
                // 设置关卡数据 - 使用通用的初始化方法
                // levelCell.setLevelData(levelIndex + 1); // 关卡编号从1开始
                this.levelCells[levelIndex] = levelCell;
            }
            
            // 设置父节点
            levelNode.setParent(this.levelContainer);
            this.levelNodes[levelIndex] = levelNode;
        }

        // 设置位置
        const levelY = this.levelPositions[levelIndex] - this.scrollY;
        this.levelNodes[levelIndex].setPosition(0, levelY, 0);
        this.levelNodes[levelIndex].active = true;
    }

    private hideLevelNode(levelIndex: number) {
        if (levelIndex < 0 || levelIndex >= this.levelCount) return;
        
        if (this.levelNodes[levelIndex]) {
            this.levelNodes[levelIndex].active = false;
        }
    }

    private setupTouchEvents() {
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        this.isDragging = true;
        const touchPos = event.getUILocation();
        this.startTouchPos.set(touchPos.x, touchPos.y, 0);
        this.lastTouchPos.set(touchPos.x, touchPos.y, 0);
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        const touchPos = event.getUILocation();
        const deltaY = touchPos.y - this.lastTouchPos.y;
        
        // 更新scrollY（手指上移，scrollY增大，内容下移）
        this.scrollY -= deltaY;
        
        // 更新背景图位置和关卡位置
        this.updateBgPositionsByScroll();

        this.lastTouchPos.set(touchPos.x, touchPos.y, 0);

        this.updateLevelVisble();
    }

    private onTouchEnd(event: EventTouch) {
        this.isDragging = false;
        this.updateLevelVisble();
    }

    private checkAndRearrangeBg() {
        const screenTop = this.screenHeight / 2;
        const screenBottom = -this.screenHeight / 2;
        const cycleHeight = this.bgHeights.reduce((sum, h) => sum + h, 0);
        
        // 添加缓冲区，提前触发重排避免空白区域
        const bufferZone = this.screenHeight * 0.2; // 20%屏幕高度作为缓冲区
        
        // 检查每张图是否需要重新定位以实现无缝循环
        for (let i = 0; i < this.bgNodes.length; i++) {
            const currentPos = this.bgNodes[i].node.position;
            const currentHeight = this.bgHeights[i];
            
            // 如果图片即将移出上方屏幕（加入缓冲区），将其移到下方
            if (currentPos.y - currentHeight / 2 > screenTop + bufferZone) {
                // 将图片移到循环的底部
                const newY = currentPos.y - cycleHeight;
                this.bgNodes[i].node.setPosition(0, newY, 0);
                
                // 同时更新对应的baseCenters
                this.baseCenters[i] -= cycleHeight;
            }
            // 如果图片即将移出下方屏幕（加入缓冲区），将其移到上方
            else if (currentPos.y + currentHeight / 2 < screenBottom - bufferZone) {
                // 将图片移到循环的顶部
                const newY = currentPos.y + cycleHeight;
                this.bgNodes[i].node.setPosition(0, newY, 0);
                
                // 同时更新对应的baseCenters
                this.baseCenters[i] += cycleHeight;
            }
        }
    }

    updateLevelVisble() {
        // 实时更新可见关卡的位置
        for (const levelIndex of this.visibleLevels) {
            if (this.levelNodes[levelIndex] && this.levelNodes[levelIndex].active) {
                const levelY = this.levelPositions[levelIndex] - this.scrollY;
                this.levelNodes[levelIndex].setPosition(0, levelY, 0);
            }
        }
    }

    onDestroy() {
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}

