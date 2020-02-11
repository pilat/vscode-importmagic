import * as vscode from 'vscode';

export class Logger {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('vscode-importmagic');
    }

    public dispose() {
        this.channel.dispose();
    }

    public log(prefix: string, message: string) {
        this.channel.appendLine(prefix + ' ' + getTimestamp() + ' ' + message);
    }

    public logError(prefix: string, message: string) {
        this.channel.appendLine(prefix + ' ' + getTimestamp() + ' ERR: ' + message);
    }
}

function getTimestamp() {
    const date = new Date();
    return '[' + date.toUTCString() + ']'
}
