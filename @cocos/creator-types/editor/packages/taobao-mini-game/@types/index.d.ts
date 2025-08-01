/// <reference path='../../../@types/index'/>

export * from '@cocos/creator-types/editor/packages/builder/@types/protected';
import { IInternalBuildOptions, IPolyFills, ISettings } from '@cocos/creator-types/editor/packages/builder/@types/protected';

export type IOrientation = 'landscape' | 'portrait';

export interface ITaskOption extends IInternalBuildOptions {
    packages: {
        'taobao-mini-game': {
            appid: string;
            deviceOrientation: IOrientation;
            globalVariable: string;
            separateEngine: boolean;
            wasmSubpackage: boolean;
            removeGlobalAdapter: boolean;
        };
    };
}