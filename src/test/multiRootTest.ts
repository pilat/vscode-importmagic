import * as path from 'path';

process.env.CODE_TESTS_WORKSPACE = path.join(__dirname, '..', '..', 'src', 'testMultiRootWkspc', 'multi.code-workspace');

function start() {
    // tslint:disable-next-line:no-require-imports
    require('../../node_modules/vscode/bin/test');
}
start();
