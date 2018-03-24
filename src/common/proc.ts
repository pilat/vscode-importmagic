// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { spawn } from 'child_process';
import { Observable } from 'rxjs/Observable';
import { Disposable } from 'vscode';
import { ExecutionResult, IProcessService, ObservableExecutionResult, Output, SpawnOptions, StdErrError } from './types';
import * as iconv from 'iconv-lite';

export class ProcessService implements IProcessService {
    public execObservable(file: string, args: string[], options: SpawnOptions = {}): ObservableExecutionResult<string> {
        const encoding = 'utf8';
        const spawnOptions = { ...options };
        if (!spawnOptions.env || Object.keys(spawnOptions).length === 0) {
            spawnOptions.env = { ...process.env };
        }

        // Always ensure we have unbuffered output.
        spawnOptions.env.PYTHONUNBUFFERED = '1';
        if (!spawnOptions.env.PYTHONIOENCODING) {
            spawnOptions.env.PYTHONIOENCODING = 'utf-8';
        }

        const proc = spawn(file, args, spawnOptions);
        let procExited = false;

        const output = new Observable<Output<string>>(subscriber => {
            const disposables: Disposable[] = [];

            const on = (ee: NodeJS.EventEmitter, name: string, fn: Function) => {
                ee.on(name, fn);
                disposables.push({ dispose: () => ee.removeListener(name, fn) });
            };

            if (options.token) {
                disposables.push(options.token.onCancellationRequested(() => {
                    if (!procExited && !proc.killed) {
                        proc.kill();
                        procExited = true;
                    }
                }));
            }

            const sendOutput = (source: 'stdout' | 'stderr', data: Buffer) => {
                const out = iconv.decode(Buffer.concat([data]), encoding);
                if (source === 'stderr' && options.throwOnStdErr) {
                    subscriber.error(new StdErrError(out));
                } else {
                    subscriber.next({ source, out: out });
                }
            };

            on(proc.stdout, 'data', (data: Buffer) => sendOutput('stdout', data));
            on(proc.stderr, 'data', (data: Buffer) => sendOutput('stderr', data));

            proc.once('close', () => {
                procExited = true;
                subscriber.complete();
                disposables.forEach(disposable => disposable.dispose());
            });
            proc.once('error', ex => {
                procExited = true;
                subscriber.error(ex);
                disposables.forEach(disposable => disposable.dispose());
            });
        });

        return { proc, out: output };
    }
}
