import { _decorator, Node, Label, Button, instantiate, Component, ScrollView, Prefab, Vec3, Vec2, UITransform } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { BettingComp, BetAmountItem } from "../comp/BettingComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { smc } from "../common/SingletonModuleComp";

const { ccclass, property } = _decorator;

/**
 * 下注金额选择器组件
 * 负责管理下注金额的滚动选择界面
 */
@ccclass('BetAmountSelector')
export class BetAmountSelector extends CCComp {
    @property(ScrollView)
    betScrollView: ScrollView = null!;

    @property(Node)
    betItemContainer: Node = null!;

    @property(Prefab)
    betItemPrefab: Prefab = null!;

    // 私有状态变量
    private isScrollSnapping: boolean = false; // 防止滚动递归调用

    // 回调函数
    public onBetAmountChanged: (amount: number, display: string) => void = null!;
    public onValidateBetAmount: (amount: number) => boolean = null!;

    onLoad() {
        this.setupScrollEvents();
    }

    /**
     * 重置组件状态（CCComp抽象方法实现）
     */
    reset(): void {
        this.isScrollSnapping = false;
        this.onBetAmountChanged = null!;
        this.onValidateBetAmount = null!;
    }

    /**
     * 设置滚动事件监听
     */
    private setupScrollEvents(): void {
        if (this.betScrollView) {
            this.betScrollView.node.on('scroll-ended', this.onBetScrollEnd, this);
            this.betScrollView.node.on('scrolling', this.onBetScrolling, this);
        }
    }

    /**
     * 初始化下注面板
     */
    public initBetPanel(): void {
        this.fillBetScrollView();
    }

    /**
     * 填充下注滚动视图
     */
    private fillBetScrollView(): void {
        if (!this.betItemContainer) {
            console.warn("BetItemContainer not found - skipping bet scroll view fill");
            return;
        }

        if (!this.betItemPrefab) {
            console.warn("BetItemPrefab not found - skipping bet scroll view fill");
            return;
        }

        // 清空现有子节点
        this.betItemContainer.removeAllChildren();

        // 获取BettingComp
        if (!smc.crashGame) {
            console.warn("CrashGame not found - skipping bet scroll view fill");
            return;
        }

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) {
            console.warn("BettingComp not found - skipping bet scroll view fill");
            return;
        }

        // 创建下注选项
        betting.betAmountData.forEach((betItem) => {
            try {
                const itemNode = instantiate(this.betItemPrefab);
                itemNode.name = `BetItem_${betItem.display}`;

                // 设置显示文本
                const label = itemNode.getComponent(Label);
                if (label) {
                    label.string = betItem.display;
                } else {
                    console.warn(`No Label found in bet item prefab for ${betItem.display}`);
                }

                // 设置按钮事件
                const button = itemNode.getComponent(Button);
                if (button) {
                    button.node.on(Button.EventType.CLICK, () => {
                        this.onBetItemClick(betItem);
                    }, this);
                } else {
                    console.warn(`No Button found in bet item prefab for ${betItem.display}`);
                }

                // 添加到容器
                this.betItemContainer.addChild(itemNode);

                console.log(`Created bet item: ${betItem.display} (${betItem.value})`);
            } catch (error) {
                console.error(`Error creating bet item ${betItem.display}:`, error);
            }
        });

        console.log(`Filled bet scroll view with ${betting.betAmountData.length} items`);
        
        // 初始化完成后滚动到当前选中项
        this.scheduleOnce(() => {
            this.scrollToCurrentBet();
        }, 0.1);
    }

    /**
     * 下注选项点击事件
     */
    private onBetItemClick(betItem: BetAmountItem): void {
        if (!smc.crashGame) return;

        CrashGameAudio.playButtonClick();

        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            // 找到点击的item在数组中的索引
            const clickedIndex = betting.betAmountData.indexOf(betItem);
            if (clickedIndex === -1) return;

            // 应用边界限制逻辑
            const targetIndex = this.applyBoundaryRestrictions(clickedIndex);
            const targetBetItem = betting.betAmountData[targetIndex];

            // 验证余额是否足够
            if (this.onValidateBetAmount && !this.onValidateBetAmount(targetBetItem.value)) {
                console.warn(`Insufficient balance for bet amount: ${targetBetItem.value}`);
                return;
            }

            // 滚动到目标item并选中
            this.snapToItem(targetIndex);
            
            // 设置选中状态
            betting.setCurrentBetItem(targetBetItem);
            this.updateSelectedBetState();
            
            // 通知外部组件更新UI
            if (this.onBetAmountChanged) {
                this.onBetAmountChanged(targetBetItem.value, targetBetItem.display);
            }

            console.log(`Clicked bet: ${betItem.display} (index: ${clickedIndex}), scrolled to: ${targetBetItem.display} (index: ${targetIndex})`);
        }
    }

    /**
     * 应用边界限制逻辑
     * 前2个和后2个不能被选中，如果点击它们则重定向到允许的范围
     */
    private applyBoundaryRestrictions(clickedIndex: number): number {
        if (!this.betItemContainer) return clickedIndex;
        
        const totalItems = this.betItemContainer.children.length;
        console.log(`Boundary check: clickedIndex=${clickedIndex}, totalItems=${totalItems}`);
        
        // 如果总item数少于等于4，则没有有效的选择范围
        if (totalItems <= 4) {
            console.warn("Not enough items to apply boundary restrictions");
            return Math.max(0, Math.min(clickedIndex, totalItems - 1));
        }
        
        // 前2个：重定向到第3个（索引2）
        if (clickedIndex < 2) {
            console.log(`Index ${clickedIndex} is in top boundary (< 2), redirecting to index 2`);
            return 2;
        }
        
        // 后2个：重定向到倒数第3个（索引 totalItems - 3）
        if (clickedIndex >= totalItems - 2) {
            const targetIndex = totalItems - 3;
            console.log(`Index ${clickedIndex} is in bottom boundary (>= ${totalItems - 2}), redirecting to index ${targetIndex}`);
            return targetIndex;
        }
        
        // 在有效范围内，直接返回
        console.log(`Index ${clickedIndex} is in valid range [2, ${totalItems - 3}]`);
        return clickedIndex;
    }

    /**
     * 滚动事件处理 - 滚动中
     */
    private onBetScrolling(): void {
        // 滚动过程中可以添加一些实时反馈，暂时留空
    }

    /**
     * 滚动事件处理 - 滚动结束
     */
    private onBetScrollEnd(): void {
        if (!smc.crashGame || !this.betScrollView || !this.betItemContainer) return;
        
        // 防止递归调用
        if (this.isScrollSnapping) {
            console.log("Ignoring scroll end event during snapping");
            this.isScrollSnapping = false;
            return;
        }

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        // 记录当前选中的索引作为原始位置（滚动前的位置）
        const originalIndex = betting.betAmountData.indexOf(betting.currentBetItem);
        
        // 计算滚动后应该选中的item索引
        const rawSelectedIndex = this.calculateSelectedItemIndex();
        
        // 应用边界限制逻辑
        const finalSelectedIndex = this.applyBoundaryRestrictions(rawSelectedIndex);
        
        // 验证新选择的下注金额
        const selectedBetItem = betting.betAmountData[finalSelectedIndex];
        if (selectedBetItem && this.onValidateBetAmount && !this.onValidateBetAmount(selectedBetItem.value)) {
            // 验证失败，恢复到原始选择
            const restoreIndex = originalIndex >= 0 ? originalIndex : 0;
            console.log(`Balance validation failed, restoring to index: ${restoreIndex}`);
            
            this.isScrollSnapping = true;
            this.snapToItem(restoreIndex);
            this.selectItemByIndex(restoreIndex);
            return;
        }
        
        // 验证通过，执行正常的snap对齐
        this.isScrollSnapping = true;
        this.snapToItem(finalSelectedIndex);
        
        // 更新选中状态
        this.selectItemByIndex(finalSelectedIndex);
        
        if (rawSelectedIndex !== finalSelectedIndex) {
            console.log(`Scroll boundary redirect: ${rawSelectedIndex} -> ${finalSelectedIndex}`);
        } else {
            console.log(`Scroll completed, selected index: ${finalSelectedIndex}`);
        }
    }

    /**
     * 获取item尺寸信息
     */
    private getItemSizeInfo(): { itemHeight: number, spacing: number, itemTotalHeight: number } {
        if (!this.betItemContainer || this.betItemContainer.children.length === 0) {
            console.warn("No items in bet container");
            return { itemHeight: 100, spacing: 10, itemTotalHeight: 110 };
        }

        const firstChild = this.betItemContainer.children[0];
        const firstTransform = firstChild.getComponent(UITransform);
        if (!firstTransform) {
            console.warn("No UITransform found on first bet item");
            return { itemHeight: 100, spacing: 10, itemTotalHeight: 110 };
        }

        const itemHeight = firstTransform.height;
        let spacing = 10; // 默认间距

        if (this.betItemContainer.children.length > 1) {
            const secondChild = this.betItemContainer.children[1];
            const firstPos = firstChild.position;
            const secondPos = secondChild.position;
            spacing = Math.abs(firstPos.y - secondPos.y) - itemHeight;
        }

        const itemTotalHeight = itemHeight + spacing;
        console.log(`Item size info: height=${itemHeight}, spacing=${spacing}, total=${itemTotalHeight}`);
        
        return { itemHeight, spacing, itemTotalHeight };
    }

    /**
     * 计算当前应该选中的item索引
     */
    private calculateSelectedItemIndex(): number {
        if (!this.betScrollView || !this.betItemContainer) return 2; // 默认返回第3个item

        const scrollView = this.betScrollView;
        const container = this.betItemContainer;
        
        // 获取ScrollView的content位置
        const contentPos = scrollView.content!.position;
        
        // 获取ScrollView视口的中心位置（世界坐标）
        const scrollViewTransform = scrollView.node.getComponent(UITransform)!;
        const viewportCenterY = scrollViewTransform.height / 2;
        
        // 计算相对于content的中心位置
        const relativeCenterY = viewportCenterY + contentPos.y;
        
        // 获取item尺寸信息
        const { itemTotalHeight } = this.getItemSizeInfo();
        
        // 计算最接近中心的item索引
        const itemIndex = Math.round(relativeCenterY / itemTotalHeight);
        
        // 确保索引在有效范围内
        const clampedIndex = Math.max(0, Math.min(itemIndex, container.children.length - 1));
        
        console.log(`Calculate selected index: contentY=${contentPos.y}, centerY=${viewportCenterY}, relativeY=${relativeCenterY}, itemHeight=${itemTotalHeight}, index=${clampedIndex}`);
        
        return clampedIndex;
    }

    /**
     * 滚动到指定索引的item
     */
    public snapToItem(index: number): void {
        if (!this.betScrollView || !this.betItemContainer) return;

        const scrollView = this.betScrollView;
        const container = this.betItemContainer;
        
        // 确保索引有效
        if (index < 0 || index >= container.children.length) {
            console.warn(`Invalid snap index: ${index}`);
            return;
        }

        // 获取item尺寸信息
        const { itemTotalHeight } = this.getItemSizeInfo();
        
        // 计算目标位置
        const targetY = index * itemTotalHeight;
        
        // 获取ScrollView视口高度
        const scrollViewTransform = scrollView.node.getComponent(UITransform)!;
        const viewportHeight = scrollViewTransform.height;
        const viewportCenterY = viewportHeight / 2;
        
        // 计算content应该移动到的位置
        const targetContentY = viewportCenterY - targetY;
        
        // 执行滚动动画
        scrollView.scrollToOffset(new Vec2(0, targetContentY), 0.3);
        
        console.log(`Snapping to item ${index}: targetY=${targetY}, contentY=${targetContentY}`);
    }

    /**
     * 根据索引选中item
     */
    private selectItemByIndex(index: number): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting || index < 0 || index >= betting.betAmountData.length) return;

        const selectedBetItem = betting.betAmountData[index];
        
        // 验证余额是否足够
        if (this.onValidateBetAmount && !this.onValidateBetAmount(selectedBetItem.value)) {
            console.warn(`Insufficient balance for bet amount: ${selectedBetItem.value}`);
            return;
        }

        // 设置选中状态
        betting.setCurrentBetItem(selectedBetItem);
        this.updateSelectedBetState();
        
        // 通知外部组件更新UI
        if (this.onBetAmountChanged) {
            this.onBetAmountChanged(selectedBetItem.value, selectedBetItem.display);
        }

        console.log(`Auto selected bet: ${selectedBetItem.display} (index: ${index})`);
    }

    /**
     * 滚动到当前选中的下注金额
     */
    public scrollToCurrentBet(): void {
        if (!this.betScrollView || !this.betItemContainer || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        const selectedIndex = betting.betAmountData.indexOf(betting.currentBetItem);
        if (selectedIndex >= 0) {
            this.snapToItem(selectedIndex);
        }

        console.log(`Scrolled to bet item: ${betting.currentBetItem.display}`);
    }

    /**
     * 更新选中状态的视觉效果
     */
    private updateSelectedBetState(): void {
        if (!this.betItemContainer || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        this.betItemContainer.children.forEach((child, index) => {
            const betItem = betting.betAmountData[index];
            
            if (betItem === betting.currentBetItem) {
                // 选中状态的视觉效果
                child.scale = new Vec3(1.1, 1.1, 1);
            } else {
                // 未选中状态
                child.scale = new Vec3(1, 1, 1);
            }
        });
    }

    /**
     * 设置下注选项的可交互状态
     */
    public setBetItemsInteractable(interactable: boolean): void {
        if (!this.betItemContainer) return;

        this.betItemContainer.children.forEach((child) => {
            const button = child.getComponent(Button);
            if (button) {
                button.interactable = interactable;
            }
        });
    }

    onDestroy() {
        // 清理事件监听
        if (this.betScrollView) {
            this.betScrollView.node.off('scroll-ended', this.onBetScrollEnd, this);
            this.betScrollView.node.off('scrolling', this.onBetScrolling, this);
        }

        // 清理按钮事件
        if (this.betItemContainer) {
            this.betItemContainer.children.forEach((child) => {
                const button = child.getComponent(Button);
                if (button) {
                    button.node.off(Button.EventType.CLICK);
                }
            });
        }
    }
}