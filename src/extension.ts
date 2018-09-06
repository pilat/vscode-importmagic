'use strict';

import * as vscode from 'vscode';
import { ImportMagicCompletionItemProvider } from './providers/importMagicCompletionProvider';
import { ImportMagicProvider } from './providers/importMagicProvider';
import { ImportMagicProxyFactory } from './languageServices/importMagicProxyFactory';
import { createDeferred } from './common/helpers';
import { ImportMagic } from './importMagic';

const PYTHON: vscode.DocumentSelector = { scheme: 'file', language: 'python' };
const activationDeferred = createDeferred<void>();
export const activated = activationDeferred.promise;

export function activate(context: vscode.ExtensionContext) {
    const importMagicFactory = new ImportMagicProxyFactory(context.asAbsolutePath('.'), context.storagePath);

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(PYTHON, new ImportMagicCompletionItemProvider(importMagicFactory), '.'));

    const provider = new ImportMagicProvider(importMagicFactory);
    context.subscriptions.push(new ImportMagic(provider));

    activationDeferred.resolve();
}
