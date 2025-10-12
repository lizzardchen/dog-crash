import { ITaskData, ITaskUICallback } from "../data/TaskData";



export class TaskCallbackComp implements ITaskUICallback {

    public taskStatusChanedCallback: ((taskData: ITaskData) => void) | null = null;

    onTaskStatusChanged(taskData: ITaskData): void {
        if (this.taskStatusChanedCallback) {
            this.taskStatusChanedCallback(taskData);
        }   
    }
    
    onTaskProgressChanged(taskData: ITaskData): void {
    }
    onTaskRewardClaimed(taskData: ITaskData): void {
    }
    onTaskCompleted(taskId: number): void {
    }
}
