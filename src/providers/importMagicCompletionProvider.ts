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
        if (result === undefined) {
            return [];
        }

        return result;
    }

    private async getCompletionResult(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
        : Promise<vscode.CompletionItem[] | undefined> {
        const range = document.getWordRangeAtPosition(position);
        const text = document.getText(range);
        if (!text || text.length < 2) {
            return undefined;
        }

        const importMagic = this.importMagicFactory.getImportMagicProxy(document.uri);
        if (!importMagic) {
            return undefined;
        }

        const cmd: ICommandSymbols<IResultSymbols> = {
            action: ActionType.Symbols,
            text
        };
        const result = await importMagic.sendCommand(cmd);

        return result.items.map(item => this.toVsCodeCompletion(document, position, item));
    }

    private toVsCodeCompletion(document: vscode.TextDocument, position: vscode.Position, item: ISuggestionSymbol): vscode.CompletionItem {
        const completionItem = new vscode.CompletionItem(item.symbol || item.module);
        switch (item.kind) {
            case 'C':
                completionItem.kind = vscode.CompletionItemKind.Class;
                break;
            case 'R':
                completionItem.kind = vscode.CompletionItemKind.Reference;
                break;
            case 'F':
                completionItem.kind = vscode.CompletionItemKind.Function;
                break;
            case 'M':
                completionItem.kind = vscode.CompletionItemKind.Module;
                break;
            default:
                completionItem.kind = vscode.CompletionItemKind.Text;
        }

        completionItem.command = {
            command: 'importMagic.insertImport',
            title: 'Import Magic',
            arguments: [item.module, item.symbol]
        };

        completionItem.detail = item.module ? `from ${item.module} import ${item.symbol}` : `import ${item.symbol}`;

        if (item.kind === 'R') {
            // References should be below then the others
            completionItem.sortText = completionItem.label + 'z'.repeat(30);
            completionItem.filterText = 'z'.repeat(30) + completionItem.label;
        }

        return completionItem;
    }
}
