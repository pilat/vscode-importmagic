import * as fs from 'fs-extra';
import {commands, Disposable, Position, QuickPickItem, QuickPickOptions, Range, TextDocument, window, workspace, CancellationTokenSource, WorkspaceEdit, Uri} from 'vscode';
import { ActionType, ICommandSuggestions, ICommandImport, IResultImport, IResultSymbols, ISuggestionSymbol, IDiffCommand, DiffAction } from './importMagicProxy';
import { ImportMagicProxyFactory } from './../languageServices/importMagicProxyFactory';
import { getTempFileWithDocumentContents, isTestExecution } from '../common/utils';

export interface ImportPathQuickPickItem extends QuickPickItem {
    module: string;
    symbol: string;
}

export class ImportMagicProvider {
    constructor(private importMagicFactory: ImportMagicProxyFactory) { }

    public async getImportSuggestions(sourceFile: string, unresolvedName: string): Promise<ImportPathQuickPickItem[]> {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return [];
        }

        const cmd: ICommandSuggestions<IResultSymbols> = {
            action: ActionType.Suggestions,
            sourceFile,
            unresolvedName
        };

        try{
            const importMagic = this.importMagicFactory.getImportMagicProxy(activeEditor.document.uri);
            const result = await importMagic.sendCommand(cmd);

            return result.items.map(suggestion => {
                return {
                    label: suggestion.module ? `from ${suggestion.module} import ${suggestion.symbol}` : `import ${suggestion.symbol}`,
                    description: '',
                    module: suggestion.module,
                    symbol: suggestion.symbol
                };
            });
        } catch (e) {
            window.showErrorMessage(`Importmagic: ${e.message}`);
            return undefined;
        }
    }

    public async resolveImport() {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }

        const document = activeEditor.document;

        if (!activeEditor || document.languageId !== 'python') {
            window.showErrorMessage('Importmagic: Please, open a Python source file to show import suggestions');
            return undefined;
        }

        // Get current selected name
        const position: Position = activeEditor.selection.start;
        const range = document.getWordRangeAtPosition(position);
        if (!range || range.isEmpty) {
            window.showErrorMessage('Importmagic: Empty resolve expression');
            return undefined;
        }
        const unresolvedName : string = document.getText(range);

        if (!unresolvedName || unresolvedName.length < 2) {
            window.showErrorMessage('Importmagic: Empty or very short expression for resolve');
            return undefined;
        }

        const tmpFileCreated = document.isDirty;
        const filePath = tmpFileCreated ? await getTempFileWithDocumentContents(document) : document.fileName;
        const cToken: CancellationTokenSource = new CancellationTokenSource();

        try {
            const quickPickOptions: QuickPickOptions = {
                matchOnDetail: true,
                matchOnDescription: true,
                placeHolder: `Import statement for ${unresolvedName}`
            };

            const suggestions = this.getImportSuggestions(filePath, unresolvedName);
            suggestions.then((results: ImportPathQuickPickItem[]) => {
                if (results === undefined || results.length === 0) {
                    window.showWarningMessage('Importmagic: Nothing to import');
                    cToken.cancel();
                }
            });
            const selection = await window.showQuickPick(suggestions, quickPickOptions, cToken.token);

            if (selection !== undefined) {
                commands.executeCommand('importMagic.insertImport', selection.module, selection.symbol);
            }
        } finally {
            cToken.dispose();
            if (tmpFileCreated) {
                fs.unlinkSync(filePath);
            }
        }
    }

    public async insertImport(module: string, symbol: string) {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }

        const document = activeEditor.document;

        if (!activeEditor || document.languageId !== 'python') {
            window.showErrorMessage('Importmagic: Please, open a Python source file to show import suggestions');
            return undefined;
        }

        const tmpFileCreated = document.isDirty;
        const filePath = tmpFileCreated ? await getTempFileWithDocumentContents(document) : document.fileName;

        try {
            const cmd: ICommandImport<IResultImport> = {
                action: ActionType.Import,
                sourceFile: filePath,
                module,
                symbol
            };

            const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
            const result: IResultImport = await importMagic.sendCommand(cmd);
            await this.updateSource(document.uri, result);
        } catch (e) {
            window.showErrorMessage(`Importmagic: ${e.message}`);
        } finally {
            if (tmpFileCreated) {
                fs.unlinkSync(filePath);
            }
        }
    }

    public async rebuildIndex() {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }
        const importMagic = this.importMagicFactory.getImportMagicProxy(activeEditor.document.uri);
        await importMagic.renewIndex();
    }

    public openDocument(doc) {
        this.importMagicFactory.getImportMagicProxy(doc.uri);
        // Do noting. Watcher will be initialized for document workspace
    }

    private async updateSource(fileUri: Uri, result: IResultImport) {
        const changes = new WorkspaceEdit();

        result.commands.forEach(edit => {
            const start: Position = new Position(edit.start, 0);
            const end: Position = new Position(edit.end, 0);
            const range: Range = new Range(start, end);

            switch (edit.action) {
                case DiffAction.Replace:
                    changes.replace(fileUri, range, edit.text);
                    break;
                case DiffAction.Insert:
                    changes.insert(fileUri, start, edit.text);
                    break;
                case DiffAction.Delete:
                    changes.delete(fileUri, range);
                    break;
                default:
            }
        });

        if (!changes || changes.entries().length === 0) {
            return;
        }
        await workspace.applyEdit(changes);
    }
}
