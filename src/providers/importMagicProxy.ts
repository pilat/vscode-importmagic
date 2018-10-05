import { FileSystemWatcher } from './../common/fsWatcher';
import { Progress } from './../common/progress';
import { ExtensionSettings } from './../common/configSettings';
import { ProcessService } from './../common/proc';
import { ICommandResult } from './importMagicProxy';
import * as logger from '../common/logger';
import * as path from 'path';
import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import { createDeferred, Deferred } from '../common/helpers';
import { isTestExecution } from '../common/utils';

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

interface IResultRenew extends ICommandResult {
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
    fromLine: number;
    endLine: number;
    text: string;
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
    skipTest: boolean;
    style: object;
    tempPath: string;
    workspaceName: string;
}

interface ICommandChangeFiles<T extends ICommandResult> extends ICommand<T> {
    files: string[];
}

interface ICommandRenew<T extends ICommandResult> extends ICommand<T> { }

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

    private proc: ChildProcess | null;
    private previousData = '';

    private languageServerStarted: Deferred<void>;
    private commands = new Map<number, ICommand<ICommandResult>>();
    private commandId: number = 0;
    private restartAttempts: number = 0;
    private progress: Progress = new Progress();
    private fsWatcher: FileSystemWatcher;

    constructor(private extensionRootDir: string, private workspacePath: string,
            private storagePath: string, private workspaceName: string) {
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
        await this.languageServerStarted.promise;

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

    // public isBusy() {
    //     return this.commands.size > 0;
    // }

    public async renewIndex() {
        const cmd: ICommandRenew<IResultRenew> = {
            action: ActionType.Renew
        };

        await this.sendRequest(cmd);
    }

    public async configure() {
        const isTest = isTestExecution();
        const cmd: ICommandConfigure<IResultConfigure> = {
            action: ActionType.Configure,
            paths: this.getExtraPaths(),
            skipTest: !isTest,
            tempPath: this.storagePath,
            workspaceName: this.workspaceName,
            style: {
                multiline: this.settings.multiline,
                maxColumns: this.settings.maxColumns,
                indentWithTabs: this.settings.indentWithTabs
            }
        };
        await this.sendRequest(cmd);
    }

    private onChangeProjectFiles(files: Set<string>) {
        const cmd: ICommandChangeFiles<IResultChangeFiles> = {
            action: ActionType.ChangeFiles,
            files: Array.from(files)
        };
        this.sendRequest(cmd);
    }

    private onChangeSettings() {
        this.configure();
    }

    private restartServer() {
        this.languageServerStarted = createDeferred<void>();
        this.killProcess();
        this.clearPendingRequests();
        this.spawnProcess();
    }

    private async spawnProcess() {
        this.restartAttempts += 1;
        const cwd: string = path.join(this.extensionRootDir, 'pythonFiles');
        const pythonProcess = new ProcessService();

        const pythonPath = this.settings.pythonPath;
        const args = ['importMagic.py', '-d'];
        const result = pythonProcess.execObservable(pythonPath, args, { cwd });
        this.proc = result.proc;

        if (!result.proc.pid) {
            this.languageServerStarted.reject({message: 'Importmagic: Python interpreter is not found'});
            vscode.window.showErrorMessage('Importmagic: Python interpreter is not found');
            return false;
        }

        result.proc.on('end', (end) => {
            logger.error('spawnProcess.end', `End - ${end}`);
        });
        result.proc.on('error', error => {
            logger.error('Error', `${error}`);
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
        this.languageServerStarted.resolve();
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

    private getExtraPaths(): string[] {
        // Add support for paths relative to workspace.
        const paths = this.settings.extraPaths.map(extraPath => {
            if (path.isAbsolute(extraPath)) {
                return extraPath;
            }
            if (typeof this.workspacePath !== 'string') {
                return '';
            }
            return path.join(this.workspacePath, extraPath);
        });
        paths.push(this.workspacePath);
        return paths;
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

            this.proc.stdin.write(`${JSON.stringify(extendedPayload)}\n`);
            this.commands.set(this.commandId, executionCmd);
        }catch (ex) {
            logger.error('ImportMagicProxy', `Error "${ex.message}"`);
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
            const response = JSON.parse(dataStr);
            const responseId = ImportMagicProxy.getProperty<number>(response, 'id');
            const progressMessage = ImportMagicProxy.getProperty<string>(response, 'progress');

            if (progressMessage) {
                // Only set progress
                this.progress.setTitle(progressMessage);
                return;
            } else {
                // Hide progress and parse answer
                this.progress.hide();
            }

            if (!responseId) {
                logger.error('ImportMagicProxy', 'Response not contain id');
                return;
            }

            const cmd = this.commands.get(responseId);
            if (!cmd) {
                return;
            }
            this.commands.delete(responseId);

            if (response.error) {
                logger.error('ImportMagicProxy', `Error from process: ${response.message}`);
            }

            const isError: boolean = response.error ? true : false;
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
            fromLine: ImportMagicProxy.getProperty<number>(response, 'fromLine'),
            endLine: ImportMagicProxy.getProperty<number>(response, 'endLine'),
            text: ImportMagicProxy.getProperty<string>(response, 'text') || ''
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
