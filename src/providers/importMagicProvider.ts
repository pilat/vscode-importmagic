import * as fs from 'fs-extra';
import {commands, Disposable, Position, QuickPickItem, QuickPickOptions, Range, TextDocument, window, workspace} from 'vscode';
import { IResultSuggestions, MethodType, ICommandSuggestions, ICommandImport, ICommandRemoveUnusedImports, IResultImport, IResultRemoveUnusedImports, ISuggestionItem } from './importMagicProxy';
import { ImportMagicProxyFactory } from './../languageServices/importMagicProxyFactory';
import { getTempFileWithDocumentContents, isTestExecution } from '../common/utils';

export interface ImportPathQuickPickItem extends QuickPickItem {
    module: string;
    variable?: string;
}

export class ImportMagicProvider {
    constructor(private importMagicFactory: ImportMagicProxyFactory) { }

    public async getImportSuggestions(sourceFile: string, unresolvedName: string): Promise<ImportPathQuickPickItem[]> {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return [];
        }

        const cmd: ICommandSuggestions<IResultSuggestions> = {
            method: MethodType.Suggestions,
            sourceFile,
            unresolvedName
        };

        try{
            const importMagic = this.importMagicFactory.getImportMagicProxy(activeEditor.document.uri);

            const result = await importMagic.sendCommand(cmd);
            const candidates = result.candidates;

            candidates.sort((a, b) => a.score > b.score ? -1 : 1);
            return candidates.map(item => this.suggestionToQuickPickItem(item));
        } catch (e) {
            window.showErrorMessage(`Importmagic: ${e.message}`);
            return undefined;
        }
    }

    public async onSave(document: TextDocument) {
        if (document.languageId === 'python') {
            const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
            await importMagic.buildIndex();
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

        if (!unresolvedName) {
            window.showErrorMessage('Importmagic: Empty resolve expression');
            return undefined;
        }

        const tmpFileCreated = document.isDirty;
        const filePath = tmpFileCreated ? await getTempFileWithDocumentContents(document) : document.fileName;

        try {
            const quickPickOptions: QuickPickOptions = {
                matchOnDetail: true,
                matchOnDescription: true,
                placeHolder: `Import statement for ${unresolvedName}`
            };

            const suggestions = this.getImportSuggestions(filePath, unresolvedName);
            const selection = await window.showQuickPick(suggestions, quickPickOptions);

            if (selection !== undefined) {
                commands.executeCommand('importMagic.insertImport', selection.module, selection.variable);
            }
        } finally {
            if (tmpFileCreated) {
                fs.unlinkSync(filePath);
            }
        }
    }

    public async removeUnusedImports() {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }

        const document = activeEditor.document;

        if (!activeEditor || document.languageId !== 'python') {
            window.showErrorMessage('Importmagic: Please, open a Python source for remove unused imports');
            return undefined;
        }

        const tmpFileCreated = document.isDirty;
        const filePath = tmpFileCreated ? await getTempFileWithDocumentContents(document) : document.fileName;

        try {
            const cmd: ICommandRemoveUnusedImports<IResultRemoveUnusedImports> = {
                method: MethodType.RemoveUnusedImports,
                sourceFile: filePath
            };

            const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
            await this.updateSource(await importMagic.sendCommand(cmd));
        } catch (e) {
            window.showErrorMessage(`Importmagic: ${e.message}`);
        } finally {
            if (tmpFileCreated) {
                fs.unlinkSync(filePath);
            }
        }
    }

    public async insertImport(module: string, variable?: string) {
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
                method: MethodType.Import,
                sourceFile: filePath,
                module,
                variable
            };

            const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
            await this.updateSource(await importMagic.sendCommand(cmd));
        } catch (e) {
            window.showErrorMessage(`Importmagic: ${e.message}`);
        } finally {
            if (tmpFileCreated) {
                fs.unlinkSync(filePath);
            }
        }
    }

    private suggestionToQuickPickItem(suggestion: ISuggestionItem): ImportPathQuickPickItem {
        const module = suggestion.module;
        const variable = suggestion.variable;
        const path = variable ? `from ${module} import ${variable}` : `import ${module}`;

        return {
            label: path,
            description: '', // suggestion.score.toPrecision(3),
            module: module,
            variable: variable ? variable : undefined
        };
    }

    private async updateSource(update: IResultImport) {
        const activeEditor = window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }

        // select from fromLine to endLine and paste text text
        const start: Position = new Position(update.fromLine, 0);
        const end: Position = new Position(update.endLine, 0);

        let range: Range = new Range(start, end);
        range = activeEditor.document.validateRange(range);

        return activeEditor.edit(builder => {
            builder.replace(range, update.text);
        });
    }
}
