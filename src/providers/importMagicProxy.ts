import { FileSystemWatcher } from './../common/fsWatcher';
import { ExtensionSettings } from './../common/configSettings';
import { ProcessService } from './../common/proc';
import { ICommandResult } from './importMagicProxy';
import * as path from 'path';
import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import { createDeferred, Deferred } from '../common/helpers';
import { Progress } from './../common/progress';
import { Logger } from '../common/logger';


export enum DiffAction {
    Delete = 'delete',
    Insert = 'insert',
    Replace = 'replace'
}

export interface IDiffCommand {
    action: DiffAction;
    start: number;
    end: number;
    text?: string;
}

export enum ActionType {
    Configure = 'configure',
    ChangeFiles = 'changeFiles',
    Renew = 'rebuildIndex',  // Renew index
    Suggestions = 'importSuggestions',
    Import = 'insertImport',
    Symbols = 'getSymbols'
}

export interface ICommandResult {
    requestId?: number;
}

interface IResultConfigure extends ICommandResult {
    success: boolean;
}

interface IResultChangeFiles extends ICommandResult {
    success: boolean;
}

export interface IResultRenew extends ICommandResult {
    success: boolean;
}

export interface ISuggestionSymbol {
    symbol: string;
    module: string;
    kind: string;
}

export interface IResultSymbols extends ICommandResult {
    items: ISuggestionSymbol[];
}

export interface IResultImport extends ICommandResult {
    commands: IDiffCommand[];
}

interface IResultError extends ICommandResult {
    error: boolean;
    message: string;
    traceback: string;
    type: string;
}

export interface ICommand<T extends ICommandResult> {
    action: ActionType;
    deferred?: Deferred<T>;
    commandId?: number;
    text?: string;
}

interface ICommandConfigure<T extends ICommandResult> extends ICommand<T> {
    paths: string[];
    workspacePath: string;
    skipTest: boolean;
    style: object;
    tempPath: string;
    workspaceName: string;
}

interface ICommandChangeFiles<T extends ICommandResult> extends ICommand<T> {
    files: string[];
}

export interface ICommandRenew<T extends ICommandResult> extends ICommand<T> { }

export interface ICommandSuggestions<T extends ICommandResult> extends ICommand<T> {
    sourceFile: string;
    unresolvedName: string;
}

export interface ICommandSymbols<T extends ICommandResult> extends ICommand<T> {
    text: string;
}

export interface ICommandImport<T extends ICommandResult> extends ICommand<T> {
    sourceFile: string;
    module: string;
    // location: string;
    symbol?: string;
}

export class ImportMagicProxy {
    public settings: ExtensionSettings;

    private proc: ChildProcess;
    private previousData = '';

    private processDeferred: Deferred<void>;
    private commands = new Map<number, ICommand<ICommandResult>>();
    private commandId: number = 0;
    private restartAttempts: number = 0;
    private stopReason: string = '';  // Bad startup configuration reason
    
    private fsWatcher: FileSystemWatcher;

    constructor(private extensionRootDir: string, private workspacePath: string,
            private storagePath: string, private workspaceName: string,
            private progress: Progress, private readonly logger: Logger) {
        this.settings = ExtensionSettings.getInstance(vscode.Uri.file(this.workspacePath));
        this.settings.on('change', this.onChangeSettings.bind(this));

        this.fsWatcher = new FileSystemWatcher('python', this.onChangeProjectFiles.bind(this));
        this.restartServer();
    }

    private static getProperty<T>(o: object, name: string): T {
        return <T>o[name];
    }

    public dispose() {
        this.killProcess();
    }

    public async sendCommand<T extends ICommandResult>(cmd: ICommand<T>): Promise<T> {
        await this.processDeferred.promise;
        if (this.stopReason) {
            throw new Error(`Extenstion is not ready: ${this.stopReason}`)
        }

        // Await commands from queue
        while (this.commands.size > 0) {
            const firstCmd: ICommand<ICommandResult> = this.commands.values().next().value;
            if (firstCmd === undefined) {
                break;
            }
            await firstCmd.deferred.promise;
        }

        return this.sendRequest(cmd);
    }

    public async configure() {
        const cmd: ICommandConfigure<IResultConfigure> = {
            action: ActionType.Configure,
            paths: this.settings.extraPaths,
            workspacePath: this.workspacePath,
            skipTest: this.settings.skipTestFolders,
            tempPath: this.storagePath,
            workspaceName: this.workspaceName,
            style: this.settings.style
        };

        // If configure was with error, then we will stop language server
        try {
            const result = await this.sendRequest(cmd);
        } catch (e) {
            this.stopReason = e.message;
            vscode.window.showErrorMessage(`Importmagic: ${this.stopReason}`);
        }
    }

    private onChangeProjectFiles(files: Set<string>) {
        const cmd: ICommandChangeFiles<IResultChangeFiles> = {
            action: ActionType.ChangeFiles,
            files: Array.from(files)
        };
        this.sendRequest(cmd);
    }

    private onChangeSettings() {
        // Restart language server because python path could be changed
        this.restartAttempts = 0;
        this.stopReason = '';
        this.restartServer();
    }

    private restartServer() {
        this.processDeferred = createDeferred<void>();
        this.killProcess();
        this.clearPendingRequests();
        this.spawnProcess();
    }

    private async spawnProcess() {
        this.restartAttempts += 1;
        const cwd: string = path.join(this.extensionRootDir, 'pythonFiles');
        const pythonProcess = new ProcessService();

        const pythonPath = this.settings.pythonPath;
        const args = ['importMagic.py'];
        const result = pythonProcess.execObservable(pythonPath, args, { cwd });
        this.proc = result.proc;

        if (!result.proc.pid) {
            this.processDeferred.reject();
            this.stopReason = 'Python interpreter is not found';
            vscode.window.showErrorMessage(`Importmagic: ${this.stopReason}`);
            return false;
        }

        result.proc.on('close', (end) => {
            this.logger.log(`spawnProcess.end: ${end}`);
            // this.proc = null;
            if (end === 101) {
                this.stopReason = 'Python3 is required'
                vscode.window.showErrorMessage(`Importmagic: ${this.stopReason}`);
            }
        });
        result.proc.on('error', error => {
            this.logger.logError(error);
        });
        result.out.subscribe(output => {
            const data = output.out;
            const dataStr = this.previousData = `${this.previousData}${data}`;

            if (dataStr.endsWith('\n')) {
                this.previousData = '';

                dataStr.split('\n').forEach(lineStr => this.onData(lineStr));
            }
        });

        await this.configure();
        this.processDeferred.resolve();
    }

    private killProcess() {
        try {
            if (this.proc) {
                this.proc.kill();
            }
        // tslint:disable-next-line:no-empty
        } catch { }
        this.proc = null;
    }

    private sendRequest<T extends ICommandResult>(cmd: ICommand<T>): Promise<T> {
        this.commandId += 1;

        const extendedPayload = {
            requestId: this.commandId,
            ...cmd
        };

        const executionCmd = cmd;
        executionCmd.deferred = createDeferred<T>();
        executionCmd.commandId = this.commandId;

        try {
            if (!this.proc) {
                throw new Error('ImportMagic process is die');
            }

            this.logger.log(`cmd -> ${JSON.stringify(extendedPayload)}`);
            this.proc.stdin.write(`${JSON.stringify(extendedPayload)}\n`);
            this.commands.set(this.commandId, executionCmd);
        }catch (ex) {
            this.logger.logError(ex.message);
            if (this.restartAttempts < 10) {
                this.restartServer();
                return Promise.reject('ImportMagic process will be restarted. Try run command again');
            } else {
                return Promise.reject('ImportMagic can not start the process');
            }
        }
        return executionCmd.deferred.promise;
    }

    private clearPendingRequests() {
        this.commands.forEach(item => {
            item.deferred.reject();
        });
        this.commands.clear();
    }

    private onData(dataStr: string) {
        try{
            if (dataStr) {
                this.logger.log(`<- ${dataStr}`);
            }
            const response = JSON.parse(dataStr);
            const responseId = ImportMagicProxy.getProperty<number>(response, 'id');
            const progressMessage = ImportMagicProxy.getProperty<string>(response, 'progress');
            const isError: boolean = !!response.error;

            if (progressMessage) {
                // Only set progress
                this.progress.setTitle(progressMessage);
                return;
            } else {
                // Hide progress and parse the answer
                this.progress.hide();
            }

            // Somethimes error may happened just after startup
            if (isError) {
                this.logger.logError(response.message);
            }

            if (responseId === undefined) {
                this.logger.logError('Response is not contain id');
                return;
            }

            const cmd = this.commands.get(responseId);
            if (!cmd) {
                return;
            }
            this.commands.delete(responseId);

            const handler = isError ? this.onError : this.getCommandHandler(cmd.action);
            if (!handler) {
                return;
            }

            const result = handler.call(this, cmd, response);

            if (cmd && cmd.deferred) {
                if (isError) {
                    cmd.deferred.reject(result);
                } else {
                    cmd.deferred.resolve(result);
                }
            }
            // tslint:disable-next-line:no-empty
        } catch { }
    }

    private getCommandHandler(command: ActionType): undefined | ((command: ICommand<ICommandResult>,
        response: object) => ICommandResult) {
        switch (command) {
            case ActionType.Configure:
                return this.onConfigure;
            case ActionType.ChangeFiles:
                return this.onChangeFiles;
            case ActionType.Renew:
                return this.onRenew;
            case ActionType.Suggestions:
                return this.onSymbols;  // this.onSuggestions;
            case ActionType.Symbols:
                return this.onSymbols;
            case ActionType.Import:
                return this.onImport;
            default:
                return;
        }
    }

    private onError(command: ICommand<ICommandResult>, response: object): IResultError {
        return {
            requestId: command.commandId,
            error: true,
            message: ImportMagicProxy.getProperty<string>(response, 'message'),
            traceback: ImportMagicProxy.getProperty<string>(response, 'traceback'),
            type: ImportMagicProxy.getProperty<string>(response, 'type')
        };
    }

    private onConfigure(command: ICommand<ICommandResult>, response: object): IResultConfigure {
        return {
            requestId: command.commandId,
            success: ImportMagicProxy.getProperty<boolean>(response, 'success')
        };
    }

    private onChangeFiles(command: ICommand<ICommandResult>, response: object): IResultChangeFiles {
        return {
            requestId: command.commandId,
            success: ImportMagicProxy.getProperty<boolean>(response, 'success')
        };
    }

    private onRenew(command: ICommand<ICommandResult>, response: object): IResultRenew {
        return {
            requestId: command.commandId,
            success: ImportMagicProxy.getProperty<boolean>(response, 'success')
        };
    }

    private onImport(command: ICommand<ICommandResult>, response: object): IResultImport {
        return {
            requestId: command.commandId,
            commands: ImportMagicProxy.getProperty<IDiffCommand[]>(response, 'diff')
        };
    }

    private onSymbols(command: ICommand<ICommandResult>, response: object): IResultSymbols {
        const items = ImportMagicProxy.getProperty<ISuggestionSymbol[]>(response, 'items');
        return {
            requestId: command.commandId,
            items
        };
    }
}
