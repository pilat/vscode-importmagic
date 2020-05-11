import { EventEmitter } from 'events';
import { ConfigurationTarget, Uri } from 'vscode';

import { SystemVariables } from './systemVariables';
import { ISettings, IStyle } from './types';
import { isTestExecution } from './utils';

import * as child_process from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import * as Path from 'path';
import * as untildify from 'untildify';

export const IS_WINDOWS = /^win/.test(process.platform);

export class Settings implements ISettings, vscode.Disposable {
    public extraPaths: string[] = [];
    public ignoreFolders: string[] = [];
    private multiline: string = null;
    private maxColumns: number = null;
    private indentWithTabs: boolean = null;
    public skipTestFolders: boolean = true;

    private workspaceRoot: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private workspace: vscode.WorkspaceFolder;
    private _pythonPath: string;

    constructor(workspacePath: string, listener) {
        this.workspaceRoot = vscode.Uri.file(workspacePath)
        if (!this.workspaceRoot && Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
            this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        }

        this.disposables.push(vscode.workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
            listener()
        }));

        this.initializeSettings();
    }

    public dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }

    private initializeSettings() {
        const workspaceRoot = this.workspaceRoot.fsPath;
        const systemVariables: SystemVariables = new SystemVariables(this.workspaceRoot ? this.workspaceRoot.fsPath : undefined);
        const pythonSettings = vscode.workspace.getConfiguration('python', this.workspaceRoot);
        const pluginSettings = vscode.workspace.getConfiguration('importMagic', this.workspaceRoot);
        const editorSettings = vscode.workspace.getConfiguration('editor', this.workspaceRoot);

        this.pythonPath = systemVariables.resolveAny(pythonSettings.get<string>('pythonPath'))!;
        this.pythonPath = getAbsolutePath(this.pythonPath, workspaceRoot);

        let extraPaths:string[] = systemVariables.resolveAny(pythonSettings.get<string[]>('autoComplete.extraPaths'))!;
        this.extraPaths = [];
        for (let path of Array.isArray(extraPaths) ? extraPaths : [extraPaths]) {
            this.extraPaths.push(getAbsolutePath(path, workspaceRoot))
        }

        this.multiline = pluginSettings.get('multiline');
        this.maxColumns = pluginSettings.get('maxColumns');
        this.indentWithTabs = pluginSettings.get('indentWithTabs');
        this.skipTestFolders = pluginSettings.get('skipTestFolders');
        this.ignoreFolders = pluginSettings.get('ignoreFolders');

        if (!this.maxColumns) {
            const rulers = editorSettings.get<number[]>('rulers', []);
            if (rulers.length > 0 && rulers[0] > 39) {
                this.maxColumns = rulers[0];
            }
        }
    }

    public get pythonPath(): string {
        return this._pythonPath;
    }
    public set pythonPath(value: string) {
        if (this._pythonPath === value) {
            return;
        }
        // Add support for specifying just the directory where the python executable will be located.
        // E.g. virtual directory name.
        try {
            this._pythonPath = getPythonExecutable(value);
        } catch (ex) {
            this._pythonPath = value;
        }
    }

    public get style(): IStyle {
        const obj: IStyle = {};
        if (this.multiline !== null) {
            obj.multiline = this.multiline;
        }
        if (this.maxColumns !== null) {
            obj.maxColumns = this.maxColumns;
        }
        if (this.indentWithTabs !== null) {
            obj.indentWithTabs = this.indentWithTabs;
        }

        return obj;
    }
}

function getAbsolutePath(pathToCheck: string, rootDir: string): string {
    pathToCheck = untildify(pathToCheck) as string;
    if (isTestExecution() && !pathToCheck) { return rootDir; }
    return path.isAbsolute(pathToCheck) ? pathToCheck : path.resolve(rootDir, pathToCheck);
}

function getPythonExecutable(pythonPath: string): string {
    pythonPath = untildify(pythonPath) as string;

    // If only 'python'.
    if (pythonPath === 'python' ||
        pythonPath.indexOf(path.sep) === -1 ||
        path.basename(pythonPath) === path.dirname(pythonPath)) {
        return pythonPath;
    }

    if (isValidPythonPath(pythonPath)) {
        return pythonPath;
    }

    // Keep python right on top, for backwards compatibility.
    const KnownPythonExecutables = ['python', 'python4', 'python3.9', 'python3.8', 'python3.7', 'python3.6', 'python3.5', 'python3'];

    for (let executableName of KnownPythonExecutables) {
        // Suffix with 'python' for linux and 'osx', and 'python.exe' for 'windows'.
        if (IS_WINDOWS) {
            executableName = `${executableName}.exe`;
            if (isValidPythonPath(path.join(pythonPath, executableName))) {
                return path.join(pythonPath, executableName);
            }
            if (isValidPythonPath(path.join(pythonPath, 'scripts', executableName))) {
                return path.join(pythonPath, 'scripts', executableName);
            }
        } else {
            if (isValidPythonPath(path.join(pythonPath, executableName))) {
                return path.join(pythonPath, executableName);
            }
            if (isValidPythonPath(path.join(pythonPath, 'bin', executableName))) {
                return path.join(pythonPath, 'bin', executableName);
            }
        }
    }

    return pythonPath;
}

function isValidPythonPath(pythonPath: string): boolean {
    try {
        const output = child_process.execFileSync(pythonPath, ['-c', 'print(1234)'], { encoding: 'utf8' });
        return output.startsWith('1234');
    } catch (ex) {
        return false;
    }
}
