import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, UITransform } from 'cc';
import { CrashGameAudio } from '../config/CrashGameAudio';

const { ccclass, property } = _decorator;

@ccclass('CoinFlyEffect')
export class CoinFlyEffect extends Component {
    @property(Prefab)
    coinPrefab: Prefab = null!;
    
    @property
    flyDuration: number = 1.0; // 单个金币飞行时间
    
    @property  
    flyInterval: number = 0.1; // 金币间隔时间（秒）
    
    @property
    randomOffset: number = 30; // 起始位置随机偏移范围
    
    /**
     * 开始金币飞行动画
     * @param amount 金币数量
     * @param startWorldPos 起始世界坐标 
     * @param endWorldPos 目标世界坐标
     * @param onAllComplete 所有金币飞行完成回调
     */
    startCoinFly(amount: number, startWorldPos: Vec3, endWorldPos: Vec3, onAllComplete?: () => void): void {
        if (amount <= 0) {
            onAllComplete?.();
            return;
        }
        
        console.log(`Starting coin fly animation: ${amount} coins`);
        
        // 1. 计算飞行金币数量
        const flyCount = this.calculateFlyCount(amount);
        console.log(`Flying ${flyCount} coins for ${amount} total coins`);
        
        let completedCount = 0;
        
        // 2. 批量创建和飞行金币
        for (let i = 0; i < flyCount; i++) {
            this.scheduleOnce(() => {
                this.createAndFlyCoin(startWorldPos, endWorldPos, () => {
                    completedCount++;
                    // 所有金币飞行完成时触发回调
                    if (completedCount === flyCount && onAllComplete) {
                        onAllComplete();
                    }
                });
                CrashGameAudio.playCoinCollect();
            }, i * this.flyInterval);
        }
    }
    
    /**
     * 计算飞行金币数量
     * @param amount 实际金币数量
     * @returns 飞行的金币数量
     */
    private calculateFlyCount(amount: number): number {
        if (amount <= 10) {
            return amount;
        } else if (amount <= 100) {
            return 10 + Math.floor(amount / 10);
        } else if (amount <= 1000) {
            return 15 + Math.floor(amount / 100);
        } else if (amount <= 10000) {
            return 18 + Math.floor(amount / 1000);
        } else {
            return 20 + Math.floor(amount / 10000);
        }
    }
    
    /**
     * 创建并飞行单个金币
     * @param startWorldPos 起始世界坐标
     * @param endWorldPos 目标世界坐标
     * @param onComplete 完成回调
     */
    private createAndFlyCoin(startWorldPos: Vec3, endWorldPos: Vec3, onComplete?: () => void): void {
        if (!this.coinPrefab) {
            console.warn("CoinFlyEffect: coinPrefab is not set");
            onComplete?.();
            return;
        }
        
        // 创建金币实例
        const coinNode = instantiate(this.coinPrefab);
        if (!coinNode) {
            console.warn("CoinFlyEffect: failed to instantiate coin prefab");
            onComplete?.();
            return;
        }
        
        // 将金币添加到场景中（添加到当前节点的父节点，确保能正确使用世界坐标）
        const parentNode = this.node.parent || this.node;
        parentNode.addChild(coinNode);
        
        // 添加随机偏移到起始位置，让金币不完全重叠
        const randomOffsetX = (Math.random() - 0.5) * this.randomOffset;
        const randomOffsetY = (Math.random() - 0.5) * this.randomOffset;
        const actualStartPos = startWorldPos.clone().add(new Vec3(randomOffsetX, randomOffsetY, 0));
        
        // 设置金币的世界坐标
        const uiTransform = coinNode.getComponent(UITransform);
        if (uiTransform) {
            // 将世界坐标转换为本地坐标
            const parentTransform = parentNode.getComponent(UITransform);
            if (parentTransform) {
                const localStartPos = new Vec3();
                parentTransform.convertToNodeSpaceAR(actualStartPos, localStartPos);
                coinNode.setPosition(localStartPos);
            } else {
                coinNode.setPosition(actualStartPos);
            }
        }
        
        // 计算目标本地坐标
        const localEndPos = new Vec3();
        const parentTransform = parentNode.getComponent(UITransform);
        if (parentTransform) {
            parentTransform.convertToNodeSpaceAR(endWorldPos, localEndPos);
        } else {
            localEndPos.set(endWorldPos);
        }
        
        // 创建飞行动画（抛物线轨迹）
        this.createFlyAnimation(coinNode, localEndPos, onComplete);
    }
    
    /**
     * 创建飞行动画
     * @param coinNode 金币节点
     * @param targetPos 目标位置（本地坐标）
     * @param onComplete 完成回调
     */
    private createFlyAnimation(coinNode: Node, targetPos: Vec3, onComplete?: () => void): void {
        const startPos = coinNode.position.clone();
        
        // 计算中间控制点，创建抛物线效果
        const midPos = new Vec3(
            (startPos.x + targetPos.x) / 2,
            Math.max(startPos.y, targetPos.y) + 100, // 向上的抛物线
            startPos.z
        );
        
        // 使用贝塞尔曲线动画
        tween(coinNode)
            .to(this.flyDuration, {}, {
                onUpdate: (target?: Node, ratio?: number) => {
                    if (!target || ratio === undefined) return;
                    // 贝塞尔二次曲线插值
                    const t = ratio;
                    const oneMinusT = 1 - t;
                    
                    const currentPos = new Vec3(
                        oneMinusT * oneMinusT * startPos.x + 2 * oneMinusT * t * midPos.x + t * t * targetPos.x,
                        oneMinusT * oneMinusT * startPos.y + 2 * oneMinusT * t * midPos.y + t * t * targetPos.y,
                        startPos.z
                    );
                    
                    target.setPosition(currentPos);
                    
                    // 添加旋转效果
                    const rotation = target.eulerAngles.clone();
                    rotation.z += 360 * ratio * 2; // 飞行过程中旋转两圈
                    target.setRotationFromEuler(rotation);
                    
                    // 添加缩放效果
                    const scale = 1 + 0.2 * Math.sin(ratio * Math.PI); // 先变大再变小
                    target.setScale(scale, scale, 1);
                }
            })
            .call(() => {
                // 动画完成，销毁金币节点
                if (coinNode && coinNode.isValid) {
                    coinNode.destroy();
                }
                onComplete?.();
            })
            .start();
    }
    
    /**
     * 停止所有飞行动画
     */
    stopAllFlyAnimations(): void {
        // 取消所有延时调用
        this.unscheduleAllCallbacks();
        
        // 这里可以添加清理正在飞行的金币的逻辑
        console.log("CoinFlyEffect: stopped all fly animations");
    }
    
    onDestroy(): void {
        this.stopAllFlyAnimations();
    }
}