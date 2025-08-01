/// <reference path='../../../@types/index'/>
export * from '@cocos/creator-types/editor/packages/builder/@types/protected';

import { IInternalBuildOptions, InternalBuildResult } from '@cocos/creator-types/editor/packages/builder/@types/protected';
import { ITaskOption as INativeTaskOption, IOption as INativeOption } from '../../native/@types/index';

export type IOrientation = 'landscape' | 'portrait';

export interface ITaskOption extends INativeTaskOption {
    packages: {
        'google-play': IOptions;
        native: INativeOption;
    }
}

export type IAppABI = 'armeabi-v7a' | 'arm64-v8a' | 'x86' | 'x86_64';

export interface IOptions {
    packageName: string;
    resizeableActivity: boolean;
    maxAspectRatio: string;
    orientation: {
        landscapeRight: boolean;
        landscapeLeft: boolean;
        portrait: boolean;
        upsideDown: boolean;
    },

    apiLevel: number;
    appABIs: IAppABI[];

    useDebugKeystore: boolean;
    keystorePath: string;
    keystorePassword: string;
    keystoreAlias: string;
    keystoreAliasPassword: string;

    appBundle: boolean;
    androidInstant: boolean;
    googleBilling: boolean;
    playGames: boolean;
    inputSDK: boolean;
    remoteUrl: string;
    sdkPath: string;
    ndkPath: string;
    javaHome?: string;
    javaPath?: string;

    swappy: boolean;
    adpf: boolean;
    renderBackEnd: {
        vulkan: boolean;
        gles3: boolean;
        gles2: boolean;
    }

    customIcon: 'default' | 'custom',
}

export interface IBuildResult extends InternalBuildResult {
    userFrameWorks: boolean; // 是否使用用户的配置数据
}

export interface ICertificateSetting {
    country: string;
    state: string;
    locality: string;
    organizationalUnit: string;
    organization: string;
    email: string;
    certificatePath: string;

    password: string; // 密钥密码
    confirmPassword: string; // 确认密钥密码

    alias: string; // 密钥别名
    aliasPassword: string;
    confirmAliasPassword: string;

    validity: number; // 有效期
}
