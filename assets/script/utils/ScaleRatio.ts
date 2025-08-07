import { view } from "cc";

export class ScaleRatio {
    static src_height:number = 1920;
    static src_width:number = 1080;

    public static getScreenScaledHeight(height:number): number {
        const screenWidth = view.getVisibleSize().width;
        return (height * screenWidth) / this.src_width;
    }
}