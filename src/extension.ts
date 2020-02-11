'use strict';

import * as vscode from 'vscode';
import { CompletionProvider } from './providers/completionProvider';
import { ImportMagicFactory } from './importMagicFactory';
import { ContextProvider } from './providers/contextProvider';

const PYTHON: vscode.DocumentSelector = { scheme: 'file', language: 'python' };

export function activate(context: vscode.ExtensionContext) {
    const importMagicFactory = new ImportMagicFactory(context.asAbsolutePath('.'), context.storagePath);

    // Two providers
    const completionProvider = vscode.languages.registerCompletionItemProvider(PYTHON,
        new CompletionProvider(importMagicFactory), '.');
    const contextProvider = new ContextProvider(importMagicFactory);

    // Register them
    context.subscriptions.push(completionProvider, contextProvider);
}
