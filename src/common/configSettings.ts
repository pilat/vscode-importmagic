import { EventEmitter } from 'events';
import { ConfigurationTarget, Uri } from 'vscode';

import { SystemVariables } from './systemVariables';
import { IPythonSettings } from './types';
import { isTestExecution } from './utils';

import * as child_process from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import * as Path from 'path';
import * as untildify from 'untildify';

export const IS_WINDOWS = /^win/.test(process.platform);

export class PythonSettings extends EventEmitter implements IPythonSettings {
    private static pythonSettings: Map<string, PythonSettings> = new Map<string, PythonSettings>();

    public extraPaths: string[] = [];

    private workspaceRoot: vscode.Uri;

    private _pythonPath: string;
    constructor(workspaceFolder?: Uri) {
        super();
        this.workspaceRoot = workspaceFolder ? workspaceFolder : vscode.Uri.file(__dirname);
        vscode.workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
            setTimeout(() => this.emit('change'), 1);
        });

        this.initializeSettings();
    }

    public static getInstance(resource?: Uri): PythonSettings {
        const workspaceFolderUri = PythonSettings.getSettingsUri(resource);
        const workspaceFolderKey = workspaceFolderUri ? workspaceFolderUri.fsPath : '';

        if (!PythonSettings.pythonSettings.has(workspaceFolderKey)) {
            const settings = new PythonSettings(workspaceFolderUri);
            PythonSettings.pythonSettings.set(workspaceFolderKey, settings);
        }
        return PythonSettings.pythonSettings.get(workspaceFolderKey)!;
    }

    public static getSettingsUri(resource?: Uri): Uri | undefined {
        const workspaceFolder = resource ? vscode.workspace.getWorkspaceFolder(resource) : undefined;
        let workspaceFolderUri: Uri | undefined = workspaceFolder ? workspaceFolder.uri : undefined;

        if (!workspaceFolderUri && Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
            workspaceFolderUri = vscode.workspace.workspaceFolders[0].uri;
        }

        return workspaceFolderUri;
    }

    private initializeSettings() {
        const workspaceRoot = this.workspaceRoot.fsPath;
        const systemVariables: SystemVariables = new SystemVariables(this.workspaceRoot ? this.workspaceRoot.fsPath : undefined);
        const pythonSettings = vscode.workspace.getConfiguration('python', this.workspaceRoot);

        this.pythonPath = systemVariables.resolveAny(pythonSettings.get<string>('pythonPath'))!;
        this.pythonPath = getAbsolutePath(this.pythonPath, workspaceRoot);

        this.extraPaths = systemVariables.resolveAny(pythonSettings.get<string[]>('autoComplete.extraPaths'))!;
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
}

function getAbsolutePath(pathToCheck: string, rootDir: string): string {
    pathToCheck = untildify(pathToCheck) as string;
    if (isTestExecution() && !pathToCheck) { return rootDir; }
    if (pathToCheck.indexOf(path.sep) === -1) {
        return pathToCheck;
    }
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
    const KnownPythonExecutables = ['python', 'python4', 'python3.6', 'python3.5', 'python3', 'python2.7', 'python2'];

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
