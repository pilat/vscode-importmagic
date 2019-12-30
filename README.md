<h1 align="center">
  <br>
    <img src="https://github.com/pilat/vscode-importmagic/blob/master/images/icon.png?raw=true" alt="logo" width="200">
  <br>
  vscode-importmagic
  <br>
  <br>
</h1>


[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/brainfit.vscode-importmagic.svg)](https://marketplace.visualstudio.com/items?itemName=brainfit.vscode-importmagic) 
<!-- [![Build Status](https://travis-ci.org/pilat/vscode-importmagic.svg?branch=master)](https://travis-ci.org/pilat/vscode-importmagic) -->

## It helps to find unresolved imports

This Visual Studio Code extension allows to find unresolved symbols in your Python projects and helps to import them.
> ⚠️ Since version 0.2.0 it supports Python3 only!


## Demo

![Demo](https://github.com/pilat/vscode-importmagic/blob/master/images/presentation.gif?raw=true)

If you want to force suggestions you can press <kbd>ctrl</kbd> + <kbd>space</kbd> (See [IntelliSense features](https://code.visualstudio.com/docs/editor/intellisense#_intellisense-features) for more information)


## Configuration
1. You can use `.isort.cfg` in your project: [see more details here](https://github.com/timothycrosley/isort).

2. If your project contain `editor.rulers` option, extension will take the first value from there and assign it as `line_length` for iSort.

3. You can override line_length with option `importMagic.maxColumns`.

- `importMagic.multiline`: Imports can be aligned with `backlslash` or `parentheses`. By-default this option is undefined. Alignment will be applied with iSort defaults.
- `importMagic.indentWithTabs`: Make tab indents instead four spaces. By-default this option undefined.
- `importMagic.skipTestFolders`: Do not indexing test folders in your project. It's true by default.


## Install notes
- You must have installed python interpretor (and `"python.pythonPath"` in your settings). Python versions 3.4 and above are supported.
- This extension will scan whole project root directory
- Alternatively, you may put some directories `"python.autoComplete.extraPaths"` and they'll be scanned explicitly


## Caveats
1. It supports only Python3 interpreters.
2. If you have problem with autocomplete make sure that `"python.autoComplete.extraPaths"` option contains the path with your source code.
3. Symbols from some packages may be unavialable when package contains the `__all__` variable.
4. Symbols may be unavialable when package doesn't have `__init__.py`
5. It doesn't scan any `test` folder and whatever deeper. Use `"importMagic.skipTestFolders"` option to override it


## Roadmap
- Tests :|


## Contributing
- I'll appreciate any merge request that will do this project better


## License 
[MIT](LICENSE)

- Some parts of code based on https://github.com/DonJayamanne/pythonVSCode
- This extension based https://github.com/alecthomas/importmagic
- Also we use Whoosh https://bitbucket.org/mchaput/whoosh/overview
- iSort prepares import blocks: https://github.com/timothycrosley/isort
 
