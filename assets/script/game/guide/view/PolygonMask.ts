/*
 * @Author: dgflash
 * @Date: 2022-03-23 10:31:06
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 10:13:58
 */
import * as cc from "cc";
import { Component, Mask, _decorator } from "cc";
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/** 多边形遮罩编辑 */
@ccclass("PolygonMask")
@executeInEditMode
@requireComponent([cc.PolygonCollider2D, cc.Mask])
export class PolygonMask extends Component {
	/** 遮罩组件 */
	mask: Mask = null!;
	/** 用于编辑器中自定义位置的拖拽操作，如果不用物理引擎时，可考虑换成一个数据结构 */
	polygon: cc.PolygonCollider2D = null!;

	onLoad() {
		this.mask = this.getComponent(cc.Mask)!;
		this.polygon = this.getComponent(cc.PolygonCollider2D)!;
		if (this.mask.type !== cc.Mask.Type.GRAPHICS_STENCIL) {
			cc.error("PolygonMask: mask type must be graphics_stencil");
			return;
		}

		// 监听 point 修改
		// @ts-ignore
		let old_value = this.polygon["_points"];
		Object.defineProperty(this.polygon, "_points", {
			get: () => old_value,
			set: (new_value) => {
				old_value = new_value;
				// 更新遮罩
				this.draw();
			},
		});
	}

	/** 绘制遮罩 */
	draw(): void {
		if (this.mask.type !== cc.Mask.Type.GRAPHICS_STENCIL) {
			return;
		}

		if (!this.polygon.points || this.polygon.points.length === 0) {
			return;
		}

		// 根据多边形点计算包围圆
		const circle = this.calculateBoundingCircle(this.polygon.points);
		
		var g:any = this.mask.subComp;
		g.clear();
		// 绘制圆形
		g.circle(circle.centerX, circle.centerY, circle.radius);
		g.stroke();
		g.fill();
	}

	/** 根据多边形点计算包围圆 */
	private calculateBoundingCircle(points: cc.Vec2[]): { centerX: number, centerY: number, radius: number } {
		if (points.length === 0) {
			return { centerX: 0, centerY: 0, radius: 0 };
		}

		// 计算多边形的中心点（重心）
		let centerX = 0;
		let centerY = 0;
		for (const point of points) {
			centerX += point.x;
			centerY += point.y;
		}
		centerX /= points.length;
		centerY /= points.length;

		// 计算从中心点到所有顶点的最大距离作为半径
		let maxDistance = 0;
		for (const point of points) {
			const distance = Math.sqrt(
				(point.x - centerX) * (point.x - centerX) + 
				(point.y - centerY) * (point.y - centerY)
			);
			if (distance > maxDistance) {
				maxDistance = distance;
			}
		}

		return {
			centerX: centerX,
			centerY: centerY,
			radius: maxDistance
		};
	}
}
