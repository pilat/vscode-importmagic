import * as vscode from 'vscode';
import { CompletionContext, commands, Disposable } from 'vscode';
import { ImportMagicProxyFactory } from '../languageServices/importMagicProxyFactory';
import { IResultSymbols, ActionType, ICommandSymbols, ISuggestionSymbol } from './importMagicProxy';
import { isTestExecution } from '../common/utils';

export class ImportMagicCompletionItemProvider implements vscode.CompletionItemProvider {
    constructor(private importMagicFactory: ImportMagicProxyFactory) { }

    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken,
        context: CompletionContext): Promise<vscode.CompletionItem[]> {

        const result = await this.getCompletionResult(document, position, token);
        //console.warn(`Result: ${result.length > 0 ? result[0].label : 'nothing'}`);

        if (result === undefined) {
            return [];
        }

        return result;
    }

    private async getCompletionResult(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
        : Promise<vscode.CompletionItem[] | undefined> {
        const range = document.getWordRangeAtPosition(position);
        const text = document.getText(range);
        if (!text) {
            return undefined;
        }

        //console.warn('Search %s (pos: %s)', text, position);
        const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
        const cmd: ICommandSymbols<IResultSymbols> = {
            action: ActionType.Symbols,
            text
        };
        const result = await importMagic.sendCommand(cmd);
        return result.items.map(item => this.toVsCodeCompletion(document, position, item));
    }

    private toVsCodeCompletion(document: vscode.TextDocument, position: vscode.Position, item: ISuggestionSymbol): vscode.CompletionItem {
        const completionItem = new vscode.CompletionItem(item.key);
        switch (item.score) {
            case 1.1:
                completionItem.kind = vscode.CompletionItemKind.Class;
                break;
            case 0.25:
                completionItem.kind = vscode.CompletionItemKind.Reference;
                break;
            case 1.2:
                completionItem.kind = vscode.CompletionItemKind.Function;
                break;
            case 1:
                completionItem.kind = vscode.CompletionItemKind.Module;
                break;
            default:
                completionItem.kind = vscode.CompletionItemKind.Text;
        }

        completionItem.command = {
            command: 'importMagic.insertImport',
            title: 'Import Magic',
            arguments: [item.module, item.variable]
        };

        if (item.variable) {
            completionItem.detail = `from ${item.module} import ${item.variable}`;
        } else {
            completionItem.detail = `import ${item.module}`;
        }

        return completionItem;
    }
}
