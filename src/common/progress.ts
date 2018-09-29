import * as vscode from 'vscode';

export class Progress {
    private semaphores = [];

    public setTitle(title: string) {
        this._setTitle(title);
    }

    public hide() {
        this.setTitle('');
    }

    private _setTitle(title: string) {
        if (title) {
            vscode.window.withProgress({location: vscode.ProgressLocation.Window, title}, async (progress) => {
                await new Promise((resolve, reject) => {
                    this.semaphores.push(resolve);
                });
                // this.semaphoreDeferred = null;
            }).then(() => {
                if (this.semaphores.length > 1) {
                    const sem = this.semaphores.shift();
                    sem();
                }
            });
        } else {
            while (this.semaphores.length > 0) {
                const sem = this.semaphores.shift();
                sem();
            }
        }
    }
}
