
export interface IRectLike {
    x: number;
    y: number;
    width: number;
    height: number;
}
// ---- 一些 engine 基础数据 ---- start
export interface Vec2 {
    x: number;
    y: number;
}

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface Vec4 {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface Color3 {
    r: number;
    g: number;
    b: number;
}

interface Color4 {
    r: number;
    g: number;
    b: number;
    a: number;
}

interface Mat3 {
    m00: number;
    m01: number;
    m02: number;

    m03: number;
    m04: number;
    m05: number;

    m06: number;
    m07: number;
    m08: number;
}

export interface Mat4 {
    m00: number;
    m01: number;
    m02: number;
    m03: number;

    m04: number;
    m05: number;
    m06: number;
    m07: number;

    m08: number;
    m09: number;
    m10: number;
    m11: number;

    m12: number;
    m13: number;
    m14: number;
    m15: number;
}
// ---- 一些 engine 基础数据 ---- end

// ---- 操作消息的参数定义 --- start

// set-property 消息的 options 定义
export interface SetPropertyOptions {
    uuid: string; // 修改属性的对象的 uuid
    path: string; // 属性挂载对象的搜索路径
    // key: string; // 属性的 key
    dump: IProperty; // 属性 dump 出来的数据
    record?: boolean;// 是否记录undo
}

// 编辑操作增加undo管理选项
export interface ISceneUndoOptions {
    tag?: string;//undo的标签
    auto?: boolean;//是否自动记录
    customCommand?: any;//自定义的command
    external?: object,// 扩展数据
}

// move-array-element 消息的 options 定义
export interface MoveArrayOptions {
    uuid: string;
    path: string;
    target: number;
    offset: number;
}

// remove-array-element 消息的 options 定义
export interface RemoveArrayOptions {
    uuid: string;
    path: string;
    index: number;
}

export interface PasteNodeOptions {
    target: string; // 目标节点
    uuids: string | string[]; // 被复制的节点 uuids
    keepWorldTransform?: boolean; // 是否保持新节点的世界坐标不变
    pasteAsChild?: boolean; // 是否粘贴成为子节点
}

export interface CutNodeOptions {
    parent: string; // 父节点
    uuids: string | string[]; // 被移入的节点 uuids
    keepWorldTransform?: boolean; // 是否保持新节点的世界坐标不变
}

// create-node 消息的 options 定义
export interface CreateNodeOptions {
    parent?: string;
    name?: string;
    keepWorldTransform?: boolean; // 是否保持新节点的世界坐标不变
    assetUuid?: string; // asset uuid , type value 格式保持兼容拖动的数据格式，有资源 id，则从资源内创建对应的节点
    nameIncrease?: boolean; // 名称自增 xxx001 -> xxx002
    snapshot?: boolean;
    // createNodeFromAsset方法里用到的
    type?: string; // 资源类型
    unlinkPrefab?: boolean; // 创建后取消 prefab 状态
    position?: Vec3; // 指定生成的位置
    canvasRequired?: boolean; // 是否需要有 Canvas
    // 未使用的参数
    // dump?: INode | IScene; // node 初始化应用的数据
    // components?: string[];
    /**
     * 根据 2D 或者 3D 模式来创建节点，
     * 例如：开启以后，创建图片在 3D 模式下会创建 SpriteRenderer 反之用 Sprite
     */
    autoAdaptToCreate?: boolean;
}

export interface ResetNodeOptions {
    uuid: string | string[];
}

export interface RemoveNodeOptions {
    uuid: string | string[];
    keepWorldTransform?: boolean;
}

export interface CreateComponentOptions {
    uuid: string;// 节点uuid
    component: string;// 组件注册到ccclass里的类名
}

export interface ResetComponentOptions {
    uuid: string;
}

export interface RemoveComponentOptions {
    uuid: string;// 组件的uuid
    // 无用参数
    // component: string;
}

export interface ExecuteComponentMethodOptions {
    uuid: string;
    name: string;
    args: any[];
}

export interface IAnimOperation {
    funcName: string;
    args: any[];
}

export interface ExecuteSceneScriptMethodOptions {
    name: string;
    method: string;
    args: any[];
}

export type IPropertyValueType = IProperty | IProperty[] | null | undefined | number | boolean | string | Vec4 | Vec3 | Vec2 | Mat4 | Array<unknown>

export interface IPropertyGroupOptions {
    id: string // 默认 'default'
    name: string,
    displayOrder: number, // 默认 Infinity, 排在最后面
    style: string // 默认为 'tab'
}

export type IPropertyLock = { 
    default: number; 
    message: string 
};

export interface IProperty {
    value: { [key: string]: IPropertyValueType } | IPropertyValueType;
    default?: any; // 默认值

    // 多选节点之后，这里存储多个数据，用于自行判断多选后的显示效果，无需更新该数据
    values?: ({ [key: string]: IPropertyValueType } | IPropertyValueType)[];

    lock?: { [key in keyof Vec4]?: IPropertyLock };

    cid?: string;
    type?: string;
    ui?: { name: string; data?: any }; // 是否用指定的 UI 组件，name 是组件的名称
    readonly?: boolean;
    visible?: boolean;
    name?: string;

    elementTypeData?: IProperty; // 数组里的数据的默认值 dump

    path?: string; // 数据的搜索路径，这个是由使用方填充的

    isArray?: boolean;
    invalid?: boolean;
    extends?: string[]; // 继承链
    displayName?: string; // 显示到界面上的名字
    displayOrder?: number; // 显示排序
    help?: string; // 帮助文档的 url 地址
    group?: IPropertyGroupOptions; // tab
    tooltip?: string; // 提示文本
    editor?: any; // 组件上定义的编辑器数据
    animatable?: boolean; // 是否可以在动画中编辑
    radioGroup?: boolean; // 是否渲染为 RadioGroup

    // Enum
    enumList?: any[]; // enum 类型的 list 选项数组

    bitmaskList?: any[];

    // Number
    min?: number; // 数值类型的最小值
    max?: number; // 数值类型的最大值
    step?: number; // 数值类型的步进值
    slide?: boolean; // 数组是否显示为滑块
    unit?: string; // 显示的单位
    radian?: boolean; // 标识是否为角度

    // Label
    multiline?: boolean; // 字符串是否允许换行
    // nullable?: boolean; 属性是否允许为空

    optionalTypes?: string[]; // 对属性是 object 且是可变类型的数据的支持，比如 render-pipeline

    userData?: { [key: string]: any }; // 用户透传的数据
}

export interface IRemovedComponentInfo {
    name: string;
    fileID: string;
}

export interface INode {
    active: IProperty;
    locked: IProperty;
    name: IProperty;
    position: IProperty;

    /**
     * 此为 dump 数据，非 node.rotation
     * 实际指向 node.eulerAngles
     * rotation 为了给用户更友好的文案
     */
    rotation: IProperty;
    mobility: IProperty;

    scale: IProperty;
    layer: IProperty;
    uuid: IProperty;

    children: any[];
    parent: any;

    __comps__: IProperty[];
    __type__: string;
    __prefab__?: any;
    _prefabInstance?: any;
    removedComponents?: IRemovedComponentInfo[];
    mountedRoot?: string;
}

export interface IComponent extends IProperty {
    value: {
        enabled: IPropertyValueType;
        uuid: IPropertyValueType;
        name: IPropertyValueType;
    } & Record<string, IPropertyValueType>;
    mountedRoot?: string;
}

export interface IScene {
    name: IProperty;
    active: IProperty;
    locked: IProperty;
    _globals: any;
    isScene: boolean;
    autoReleaseAssets: IProperty;

    uuid: IProperty;
    children: any[];
    parent: any;
    __type__: string;
    targetOverrides?: any;
}

export interface ITargetOverrideInfo {
    source: string;
    sourceInfo?: string[];
    propertyPath: string[];
    target: string;
    targetInfo?: string[];
}
// ---- 操作消息的参数定义 --- end

// ---- 场景插件返回的 info 信息 ---- start
export interface ScenePluginNodeInfo {
    uuid: string;
    components: ScenePluginComponentInfo[];
}

// 场景插件传回的场景信息
export interface ScenePluginInfo {
    // 选中节点列表
    nodes: ScenePluginNodeInfo[];

    // gizmo 的一些信息
    gizmo: {
        is2D: boolean;
    };
    // 当前编辑模式数组
    modes: string[];
}

// 场景插件传回的组件信息
export interface ScenePluginComponentInfo {
    uuid: string;
    enabled: boolean;
    type: string;
}

export interface QueryClassesOptions {
    extends?: string | string[];
    excludeSelf?: boolean;
}

// ---- 场景插件返回的 info 信息 ---- end

// ---- Contributions ---- start

export interface ContributionDropItem {
    type: string;
    message: string;
}

// ---- Contributions ---- end

export interface UnitTestInfo {
    name: string;
}

// 相机视角信息
export interface EditorCameraInfo {
    position: Vec3;
    rotation: Vec4;
    viewCenter:Vec3;
    contentRect:{
        x:number;
        y:number;
        width:number;
        height:number;
    };
    scale: number;
}
export * from './animation/public';