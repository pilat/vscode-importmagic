import { workspace } from 'vscode';
import * as testRunner from 'vscode/lib/testrunner';
import * as path from 'path';

process.env.VSC_PYTHON_CI_TEST = '1';
// process.env.IS_MULTI_ROOT_TEST = (Array.isArray(workspace.workspaceFolders) && workspace.workspaceFolders.length > 1);

// You can directly control Mocha options by uncommenting the following lines.
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info.
testRunner.configure({
    ui: 'tdd',  // the TDD UI is being used in extension.test.ts (suite, test, etc.)
    useColors: true, // colored output from test results
    timeout: 240000
});
module.exports = testRunner;
