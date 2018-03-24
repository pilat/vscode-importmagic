import {TextDocument} from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';

export function isTestExecution(): boolean {
    // tslint:disable-next-line:interface-name no-string-literal
    return process.env['VSC_PYTHON_CI_TEST'] === '1';
}

export function getTempFileWithDocumentContents(document: TextDocument): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const ext = path.extname(document.uri.fsPath);

        tmp.file({ postfix: ext }, (err, tmpFilePath, fd) => {
            if (err) {
                return reject(err);
            }
            fs.writeFile(tmpFilePath, document.getText(), ex => {
                if (ex) {
                    return reject(`Failed to create a temporary file, ${ex.message}`);
                }
                resolve(tmpFilePath);
            });
        });
    });
}
