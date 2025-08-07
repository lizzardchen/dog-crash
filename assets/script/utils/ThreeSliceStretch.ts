import { _decorator, Component, Node, UITransform, Widget } from 'cc';
import { ScaleRatio } from './ScaleRatio';

const { ccclass, property } = _decorator;

@ccclass('ThreeSliceStretch')
export class ThreeSliceStretch extends Component {

    @property(Node)
    top: Node = null!;

    @property(Node)
    mid: Node = null!;

    @property(Node)
    down: Node = null!;

    @property(Node)
    front:Node = null!;

    @property
    topDesignHeight: number = 100;

    @property
    downDesignHeight: number = 100;

    onLoad() {
        this.updateLayout();
    }

    start() {
        this.updateLayout();
    }

    updateLayout() {
        if (!this.top || !this.mid || !this.down) return;

        if( this.front ){
            const front_widget = this.front.getComponent(Widget);
            front_widget && front_widget.updateAlignment();
        }

        const nodeWidget = this.node.getComponent(Widget);
        if (nodeWidget) {
            nodeWidget.updateAlignment();
        }
        
        // 计算top实际高度
        const topActualHeight = ScaleRatio.getScreenScaledHeight(this.topDesignHeight);
        
        // 计算down实际高度
        const downActualHeight = ScaleRatio.getScreenScaledHeight(this.downDesignHeight);

        // 设置top高度
        const topTransform = this.top.getComponent(UITransform);
        if (topTransform) {
            topTransform.height = topActualHeight;
        }

        // 设置down高度
        const downTransform = this.down.getComponent(UITransform);
        if (downTransform) {
            downTransform.height = downActualHeight;
        }

        // 更新所有子节点的Widget
        const topWidget = this.top.getComponent(Widget);
        if (topWidget) {
            topWidget.updateAlignment();
        }
        
        const downWidget = this.down.getComponent(Widget);
        if (downWidget) {
            downWidget.updateAlignment();
        }

        // 设置mid的Widget边距
        const midWidget = this.mid.getComponent(Widget);
        if (midWidget) {
            midWidget.top = topActualHeight;
            midWidget.bottom = downActualHeight;
            midWidget.updateAlignment();
        }
    }

    public refreshLayout() {
        this.updateLayout();
    }
}