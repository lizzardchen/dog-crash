import { Color, Node, Quat, Vec2, Vec3, Mat4 } from 'cc';
import type { GizmoMouseEvent, IHandleData } from '../utils/defines';
declare class ControllerBase {
    get transformToolData(): import("../manager/transform-tool").TransformToolData;
    get updated(): boolean;
    get visible(): boolean;
    shape: Node;
    /** 如果 controller 锁死将不再响应拖拽 */
    isLock: boolean;
    onControllerMouseDown?(event: GizmoMouseEvent): void;
    onControllerMouseMove?(event: GizmoMouseEvent): void;
    onControllerMouseUp?(event: GizmoMouseEvent): void;
    onControllerHoverIn?(event: GizmoMouseEvent): void;
    onControllerHoverOut?(event: GizmoMouseEvent): void;
    get isMouseDown(): boolean;
    protected _updated: boolean;
    protected _scale: Vec3;
    protected _localRot: Quat;
    protected _localPos: Vec3;
    protected _rootNode: Node | null;
    protected _baseDist: number;
    protected _handleDataMap: {
        [key: string]: IHandleData;
    };
    protected _twoPI: number;
    protected _halfPI: number;
    protected _degreeToRadianFactor: number;
    protected _eventsRegistered: boolean;
    protected _isMouseDown: boolean;
    protected _color: Color;
    protected _lockSize: boolean;
    private _onDimensionChanged;
    private _onScale2DChanged;
    private _onCameraFovChanged;
    private _onCameraOrthoHeightChanged;
    private _mouseDownFuncs;
    private _mouseMoveFuncs;
    private _mouseUpFuncs;
    private _mouseLeaveFuncs;
    private _hoverInFuncs;
    private _hoverOutFuncs;
    constructor(rootNode: Node);
    set lockSize(value: boolean);
    /**
     * 更改控制器所依附的根节点
     * @param rootNode
     */
    setRoot(rootNode: Node): void;
    getRoot(): Node | null;
    createShapeNode(name: string): void;
    registerEvents(): void;
    unregisterEvents(): void;
    registerCameraMovedEvent(): void;
    unregisterCameraMoveEvent(): void;
    registerCameraFovChangedEvent(): void;
    registerOrthoHeightChangedEvent(): void;
    unregisterCameraFovChangedEvent(): void;
    unregisterOrthoHeightChangedEvent(): void;
    onEditorCameraMoved(): void;
    initHandle(node: Node, handleName: string): IHandleData;
    removeHandle(handleName: string): void;
    setHandleColor(handleName: string, color: Color, opacity?: number): void;
    resetHandleColor(event?: GizmoMouseEvent<{
        hoverInNodeMap: Map<Node, boolean>;
    }>): void;
    /**
     * 重置指定 handle 的颜色与透明度
     * @param key
     * @param hoverInNodeMap
     * @private
     */
    private resetHandleColorByKey;
    registerMouseEvents(node: Node, controlName: string): void;
    unregisterMouseEvent(node: Node, controlName: string): void;
    setPosition(value: Readonly<Vec3>): void;
    getPosition(out?: Vec3): Vec3;
    getWorldPosition(out?: Vec3): Vec3;
    getWorldPositionForNode(source?: Node | null, out?: Vec3): Vec3;
    /**
     * 该函数是为了支持 UISkew 效果而加入
     * 这里是直接把指定的矩形信息设置给 shape 节点，并且禁止自身 updateWorldTransform，
     * 只让子节点更新 updateWorldTransform，让子节点参照指定的矩阵信息去计算子节点的坐标
     * 这里用了 2 个 hack 代码
     *   第一：设置私有变量 _mat
     *   第二：设置 _transformFlags，强制不去更新节点的世界变化信息
     * @param value
     */
    setWorldMatrix(value: Readonly<Mat4>): void;
    setRotation(value: Readonly<Quat>): void;
    getRotation(out?: Quat): Quat;
    getScale(): Vec3;
    setScale(value: Vec3): void;
    updateController(): void;
    getCameraDistScalar(pos: Vec3): number;
    protected getDistScalarInOrtho(): number;
    protected isCameraInOrtho(): boolean;
    getDistScalar(node?: Node): number;
    adjustControllerSize(): void;
    needRender(node: Node): boolean;
    getRendererNodes(node: Node): Node[];
    getRayDetectNodes(node: Node): Node[];
    localToWorldPosition(localPos: Vec3): any;
    localToWorldDir(localDir: Vec3): Vec3;
    worldPosToScreenPos(worldPos: Vec3): Vec3;
    getScreenPos(localPos: Vec3): Vec3;
    getAlignAxisMoveDistance(axisWorldDir: Vec3, deltaPos: Vec2): number;
    getPositionOnPanPlane(hitPos: Vec3, x: number, y: number, panPlane: Node): boolean;
    show(): void;
    hide(): void;
    onCameraFovChanged?: (fov: number) => void;
    onDimensionChanged(): void;
    onScale2DChanged(): void;
    onCameraOrthoHeightChanged(): void;
    protected onMouseDown?(event: GizmoMouseEvent): boolean | void;
    protected onMouseMove?(event: GizmoMouseEvent): boolean | void;
    protected onMouseUp?(event: GizmoMouseEvent): boolean | void;
    protected onMouseLeave?(event: GizmoMouseEvent): void;
    protected onHoverIn?(event: GizmoMouseEvent): void;
    protected onHoverOut?(event: GizmoMouseEvent): void;
    protected onShow?(): void;
    protected onHide?(): void;
}
export default ControllerBase;
//# sourceMappingURL=base.d.ts.map