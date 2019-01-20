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

This Visual Studio Code extension allows to find unresolved symbols in your Python code and helps to import them.

![Demo](https://github.com/pilat/vscode-importmagic/blob/master/images/presentation.gif?raw=true)

If you want force suggestions you can press <kbd>ctrl</kbd> + <kbd>space</kbd> (See [IntelliSense features](https://code.visualstudio.com/docs/editor/intellisense#_intellisense-features) for more information)


## Configuration
1. You can use `.isort.cfg` in your project: [see more details here](https://github.com/timothycrosley/isort).

2. If your project contain `editor.rulers` option, extension will take the first value from there and assign it as `line_length` for iSort.

3. You can override line_length with option `importMagic.maxColumns`.

- `importMagic.multiline`: Imports can be aligned with `backlslash` or `parentheses`. By-default this option is undefined. Alignment will be applied with iSort defaults.
- `importMagic.indentWithTabs`: Make tab indents instead four spaces. By-default this option undefined.


## Install notes
- This extension needs [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
- You must have installed python interpretor (see `"python.pythonPath"` in your project settings). Python 2.7 and 3.4+ are supported.
- This extension will scan project root directory and the all directories which metioned in `"python.autoComplete.extraPaths"`.


## Tips
1. If you have problem with autocomplete make sure that `"python.autoComplete.extraPaths"` option contains the path with your source code.
2. Symbols from some packages may be unavialable when this package contains the `__all__` variable.


## Roadmap
- Tests :|


## License 
[MIT](LICENSE)

- Some parts of code based on https://github.com/DonJayamanne/pythonVSCode
- This extension based https://github.com/alecthomas/importmagic
- Also we use Whoosh https://bitbucket.org/mchaput/whoosh/overview
- iSort prepares import blocks: https://github.com/timothycrosley/isort
 
