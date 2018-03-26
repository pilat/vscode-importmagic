import * as assert from 'assert';
import * as vscode from 'vscode';
import { Uri, workspace, window, commands, WorkspaceConfiguration } from 'vscode';
import * as myExtension from '../extension';

import { rootWorkspaceUri } from './common';

import * as path from 'path';
import { closeActiveWindows, initialize, initializeTest, IS_MULTI_ROOT_TEST } from './initialize';
import { ImportMagicProxyFactory } from './../languageServices/importMagicProxyFactory';
import { ImportMagicProvider } from './../providers/importMagicProvider';

const pythonFilesPath = path.join(__dirname, '..', '..', 'src', 'test', 'pythonFiles');
const workspace1FilesPath = path.join(__dirname, '..', '..', 'src', 'testMultiRootWkspc', 'workspace1');
const extensionRootDir = path.join(__dirname, '..', '..');

const fileOne = path.join(pythonFilesPath, 'one.py');
const fileCompl = path.join(pythonFilesPath, 'compl.py');
const fileFromWorkspace1 = path.join(workspace1FilesPath, 'file.py');

suite('ImportMagic', () => {
    let im: ImportMagicProvider;
    let importMagicProxyFactory: ImportMagicProxyFactory;
    let settings: WorkspaceConfiguration;
    let oldExtraPaths: string[] | undefined;

    const configTarget = IS_MULTI_ROOT_TEST ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Workspace;
    suiteSetup(async () => {
        await initialize();
        importMagicProxyFactory = new ImportMagicProxyFactory(extensionRootDir);

        settings = workspace.getConfiguration('python', Uri.file(pythonFilesPath));
        oldExtraPaths = settings.get('autoComplete.extraPaths');
        await settings.update('autoComplete.extraPaths', [pythonFilesPath], configTarget);
    });
    setup(async () => {
        await initializeTest();

        im = new ImportMagicProvider(importMagicProxyFactory);
    });

    suiteTeardown(async () => {
        closeActiveWindows();
        if (importMagicProxyFactory) {
            importMagicProxyFactory.dispose();
        }
        await settings.update('autoComplete.extraPaths', oldExtraPaths);
    });

    teardown(async () => {
        await closeActiveWindows();
    //     ioc.dispose();
        im.dispose();
    });

    test('Import candidates from project folder', async () => {
        const textDocument = await workspace.openTextDocument(fileOne);
        await window.showTextDocument(textDocument);
        const suggestions = await im.getImportSuggestions(fileOne, 'FirstClass');
        assert.equal(suggestions.length > 0, true);
        assert.equal(suggestions[0].variable, 'FirstClass');
        assert.equal(suggestions[0].label, 'from classes import FirstClass');
    });

    test('Import candidates from system module', async () => {
        const textDocument = await workspace.openTextDocument(fileOne);
        await window.showTextDocument(textDocument);
        const suggestions = await im.getImportSuggestions(fileOne, 'sys');
        assert.equal(suggestions.length > 0, true);
        assert.equal(suggestions[0].variable, undefined);
        assert.equal(suggestions[0].module, 'sys');
        assert.equal(suggestions[0].label, 'import sys');
    });

    test('Import candidates from system modules', async () => {
        const textDocument = await workspace.openTextDocument(fileOne);
        await window.showTextDocument(textDocument);
        const suggestions = await im.getImportSuggestions(fileOne, 'path');
        assert.equal(suggestions.length > 0, true);
        assert.equal(suggestions.filter(value => value.label === 'from os import path').length, 1);
        assert.equal(suggestions.filter(value => value.label === 'from sys import path').length, 1);
    });

    test('Insert import', async () => {
        const textDocument = await workspace.openTextDocument(fileOne);
        const originalContent = textDocument.getText();

        await window.showTextDocument(textDocument);
        const suggestions = await im.getImportSuggestions(fileOne, 'FirstClass');
        const selection = suggestions[0];
        await commands.executeCommand('importMagic.insertImport', selection.module, selection.variable);
        assert.notEqual(originalContent, textDocument.getText(), 'Contents have not changed');
    });

    test('Completion provider get symbols', async () => {
        const textDocument = await workspace.openTextDocument(fileCompl);

        await window.showTextDocument(textDocument);
        const position = new vscode.Position(0, 34);

        await commands.executeCommand('importMagic.findSymbols');
        const list = await commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', textDocument.uri, position);

        assert.equal(list!.items.length > 0, true);
        assert.equal(list!.items.filter(item => item.label === 'AnotherClass2' && item.detail === 'from classes2').length, 1);
    });

    if (IS_MULTI_ROOT_TEST) {
        test('File from another workspace', async() => {
            const textDocument = await workspace.openTextDocument(fileFromWorkspace1);

            await window.showTextDocument(textDocument);
            const position = new vscode.Position(0, 7);
            const suggestions = await im.getImportSuggestions(fileFromWorkspace1, 'FirstClass');
            assert.equal(suggestions.length, 0);
        });
    }
});
