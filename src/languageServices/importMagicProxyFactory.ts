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
        this.proxyHandlers.clear();
    }

    public getImportMagicProxy(resource: Uri): ImportMagicProxy|undefined {
        const workspaceFolder = workspace.getWorkspaceFolder(resource);
        let workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : undefined;
        let workspaceName = workspaceFolder ? workspaceFolder.name : undefined;
        if (!workspacePath) {
            // "a man has no name" (c)
            return
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
