import * as vscode from 'vscode';

export class Logger {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('vscode-importmagic');
    }

    public dispose() {
        this.channel.dispose();
    }

    public log(message: string) {
        this.channel.appendLine(getTimestamp() + ' ' + message);
    }

    public logError(message: string) {
        this.channel.appendLine(getTimestamp() + ' ERR: ' + message);
    }
}

function getTimestamp() {
    const date = new Date();
    return '[' + date.toUTCString() + ']'
}
