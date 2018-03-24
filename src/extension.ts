'use strict';

import * as vscode from 'vscode';
import { ImportMagicCompletionItemProvider } from './providers/importMagicCompletionProvider';
import { ImportMagicProvider } from './providers/importMagicProvider';
import { ImportMagicProxyFactory } from './languageServices/importMagicProxyFactory';

const PYTHON: vscode.DocumentFilter = { language: 'python' };

export function activate(context: vscode.ExtensionContext) {
    const importMagicFactory = new ImportMagicProxyFactory(context.asAbsolutePath('.'));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(PYTHON,
        new ImportMagicCompletionItemProvider(importMagicFactory), '.'));
    context.subscriptions.push(new ImportMagicProvider(importMagicFactory));
}
