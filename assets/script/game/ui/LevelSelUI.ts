import { _decorator, Component, Node, Sprite, Vec3, input, Input, EventTouch, UITransform, Prefab } from 'cc';
import { LevelNodeCell } from './LevelNodeCell';
const { ccclass, property } = _decorator;

@ccclass('LevelSelUI')
export class LevelSelUI extends Component {

    @property([Sprite])
    bgNodes:Sprite[] = [];//3张背景图，需要123123123这样形式的进行拼接

    @property([Node])
    paths:Node[] = []; //100个

    @property(Prefab)
    levelcell_prefab:Prefab = null!;

    @property(Number)
    totalScrollHeight: number = 0; // 总滚动高度

    private bgHeights: number[] = []; // 每张背景图的高度
    private scrollY: number = 0; // 当前滚动位置
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private lastTouchPos: Vec3 = new Vec3();
    private centerY: number = 0; // LevelSelUI中心的Y坐标
    private baseCenters: number[] = []; // 每张图的基准中心位置
    private levelCells:LevelNodeCell[] = []; //100个

    start() {
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
        this.baseCenters = [0]; // 第一张图中心为0
        this.baseCenters[1] = this.bgHeights[0] / 2 + this.bgHeights[1] / 2; // 第二张图中心
        this.baseCenters[2] = this.baseCenters[1] + this.bgHeights[1] / 2 + this.bgHeights[2] / 2; // 第三张图中心

        // 设置总滚动高度（可以自定义，这里设为所有图片高度之和）
        if(this.totalScrollHeight <= 0){
            this.totalScrollHeight = this.bgHeights.reduce((sum, h) => sum + h, 0);
        }
        

        // 初始化scrollY为0（第一张图在中心）
        this.scrollY = 0;

        // 更新初始位置
        this.updateBgPositionsByScroll();
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
        
        // 更新背景图位置
        this.updateBgPositionsByScroll();

        this.lastTouchPos.set(touchPos.x, touchPos.y, 0);
    }

    private onTouchEnd(event: EventTouch) {
        this.isDragging = false;
    }

    private checkAndRearrangeBg() {
        const cycleHeight = this.bgHeights.reduce((sum, h) => sum + h, 0);
        
        // 检查每张图是否需要重新定位以实现无缝循环
        for (let i = 0; i < this.bgNodes.length; i++) {
            const currentPos = this.bgNodes[i].node.position;
            const currentHeight = this.bgHeights[i];
            
            // 如果图片完全移出上方视野，将其移到下方
            if (currentPos.y - currentHeight / 2 > cycleHeight / 2) {
                // 找到最下方的图片位置
                let minY = Infinity;
                for (let j = 0; j < this.bgNodes.length; j++) {
                    if (j !== i) {
                        const otherY = this.bgNodes[j].node.position.y;
                        if (otherY < minY) {
                            minY = otherY;
                        }
                    }
                }
                // 将当前图片移到最下方
                const newY = minY - currentHeight;
                this.bgNodes[i].node.setPosition(0, newY, 0);
            }
            // 如果图片完全移出下方视野，将其移到上方
            else if (currentPos.y + currentHeight / 2 < -cycleHeight / 2) {
                // 找到最上方的图片位置
                let maxY = -Infinity;
                for (let j = 0; j < this.bgNodes.length; j++) {
                    if (j !== i) {
                        const otherY = this.bgNodes[j].node.position.y;
                        if (otherY > maxY) {
                            maxY = otherY;
                        }
                    }
                }
                // 将当前图片移到最上方
                const newY = maxY + currentHeight;
                this.bgNodes[i].node.setPosition(0, newY, 0);
            }
        }
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}

