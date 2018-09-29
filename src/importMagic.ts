import { commands, workspace, Disposable } from 'vscode';
import { ImportMagicProvider } from './providers/importMagicProvider';
import { ImportMagicProxyFactory } from './languageServices/importMagicProxyFactory';

export class ImportMagic implements Disposable {
    private disposables: Disposable[] = [];

    constructor(private importMagicProvider: ImportMagicProvider) {
        const p = this.importMagicProvider;

        this.disposables.push(workspace.onDidOpenTextDocument(p.openDocument.bind(p)));
        this.disposables.push(commands.registerCommand('importMagic.resolveImport', p.resolveImport.bind(p)));
        this.disposables.push(commands.registerCommand('importMagic.insertImport', p.insertImport.bind(p)));
        this.disposables.push(commands.registerCommand('importMagic.rebuildIndex', p.rebuildIndex.bind(p)));

        // For opened documents init proxy
        for (const doc of workspace.textDocuments) {
            p.openDocument(doc);
        }
    }

    public dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
