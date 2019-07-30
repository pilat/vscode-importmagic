import * as vscode from 'vscode';

export class Progress {
    private progress = null;
    private cancellationFlag = null;

    public setTitle(message: string) {
        if (this.progress === null) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'ImportMagic'}, (progress) => {
                this.progress = progress;
                this.progress.report({ message });

                return new Promise((resolve) => {
                    this.cancellationFlag = resolve;
                });
            });
        } else {
            this.progress.report({ message })
        }
    }

    public hide() {
        if (this.cancellationFlag !== null) {
            this.cancellationFlag();
            this.progress = null;
        }
    }
}
