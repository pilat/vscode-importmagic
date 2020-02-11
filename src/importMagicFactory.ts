
import { Disposable, Uri, workspace } from 'vscode';
import { ImportMagic } from './importMagic';
import { Progress } from './common/progress';
import { Logger } from './common/logger';


export class ImportMagicFactory implements Disposable {
    private disposables: Disposable[];
    private proxyHandlers: Map<string, ImportMagic>;
    private progress: Progress = new Progress();
    private readonly logger: Logger = new Logger();

    constructor(private extensionRootPath: string, private storagePath: string) {
        this.disposables = [];
        this.proxyHandlers = new Map<string, ImportMagic>();
        this.logger.log('', 'Starting vscode-importmagic...');
    }

    public dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.proxyHandlers.clear();
    }

    public getImportMagic(resource: Uri): ImportMagic|undefined {
        const workspaceFolder = workspace.getWorkspaceFolder(resource);
        let workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : undefined;
        let workspaceName = workspaceFolder ? workspaceFolder.name : undefined;
        if (!workspacePath) {
            return
        }

        let importMagic = this.proxyHandlers.get(workspacePath);
        if (!importMagic) {
            importMagic = new ImportMagic(
                this.extensionRootPath, workspacePath, 
                this.storagePath, workspaceName, this.progress, this.logger);
            this.disposables.push(importMagic);
            this.proxyHandlers.set(workspacePath, importMagic);
        }

        return importMagic;
    }
}
