import { Disposable, Uri, workspace } from 'vscode';
import { ImportMagicProxy } from '../providers/importMagicProxy';

export class ImportMagicProxyFactory implements Disposable {
    private disposables: Disposable[];
    private proxyHandlers: Map<string, ImportMagicProxy>;

    constructor(private extensionRootPath: string, private storagePath: string) {
        this.disposables = [];
        this.proxyHandlers = new Map<string, ImportMagicProxy>();
    }

    public dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }

    public getImportMagicProxy(resource: Uri): ImportMagicProxy {
        const workspaceFolder = workspace.getWorkspaceFolder(resource);
        let workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : undefined;
        let workspaceName = workspaceFolder ? workspaceFolder.name : undefined;
        if (!workspacePath) {
            if (Array.isArray(workspace.workspaceFolders) && workspace.workspaceFolders.length > 0) {
                workspacePath = workspace.workspaceFolders[0].uri.fsPath;
                workspaceName = workspace.workspaceFolders[0].name;
            } else {
                workspacePath = __dirname;
                workspaceName = 'default';
            }
        }

        let importMagic = this.proxyHandlers.get(workspacePath);
        if (!importMagic) {
            importMagic = new ImportMagicProxy(this.extensionRootPath, workspacePath, this.storagePath, workspaceName);
            this.disposables.push(importMagic);
            this.proxyHandlers.set(workspacePath, importMagic);
        }

        return importMagic;
    }
}
