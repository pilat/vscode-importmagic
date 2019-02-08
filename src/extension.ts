'use strict';

import * as vscode from 'vscode';
import { ImportMagicCompletionItemProvider } from './providers/importMagicCompletionProvider';
import { ImportMagicProvider } from './providers/importMagicProvider';
import { ImportMagicProxyFactory } from './languageServices/importMagicProxyFactory';
import { ImportMagic } from './importMagic';

const PYTHON: vscode.DocumentSelector = { scheme: 'file', language: 'python' };

export function activate(context: vscode.ExtensionContext) {
    const importMagicFactory = new ImportMagicProxyFactory(context.asAbsolutePath('.'), context.storagePath);
    const completionProvider = vscode.languages.registerCompletionItemProvider(PYTHON,
        new ImportMagicCompletionItemProvider(importMagicFactory), '.');

    const provider = new ImportMagicProvider(importMagicFactory);
    const app = new ImportMagic(provider);

    context.subscriptions.push(completionProvider, app);
}
