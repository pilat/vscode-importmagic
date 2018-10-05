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

## Find unresolved symbols in Python code.

This Visual Studio Code extension allow to find unresolved symbols in Python code and make import them.

Completion provider can find import candidates from whole of your project.

![Demo](https://github.com/pilat/vscode-importmagic/blob/master/images/presentation.gif?raw=true)

When do you want to force suggestions, press <kbd>ctrl</kbd> + <kbd>space</kbd> (See [IntelliSense features](https://code.visualstudio.com/docs/editor/intellisense#_intellisense-features) for more information)


## Settings
> `"importMagic.maxColumns"`  
Setting the maximum number of columns to align correctly the import block. By default it gets the first value from editor.rulers. If it's empty, the default value will be 79.
Default value is 0.

> `"importMagic.multiline"`
Imports can align using backlslash or parentheses.
Default value is "backslash".

> `"importMagic.indentWithTabs"`
Make tab indents instead spaces.
false by default.


## Install notes
- This extension needs [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
- You must have installed python interpretor (see `"python.pythonPath"` in your project settings)
- This extension scans files from project root directory and from the all directories metioned in `"python.autoComplete.extraPaths"`.


## Tips
1. When you have problems with autocomplete make sure that `"python.autoComplete.extraPaths"` points to your source code.
2. Symbols from some packages may be unavialable when this package contains the `__all__` variable.


## Changelog
### 0.0.10
- Working with Multi-root Workspaces was fixed
- Minor changes

### 0.0.9
- Implements Whoosh indexing and searching library.
- Partial index renew while files were changing.

### 0.0.8
- Importmagic index cache feature was temporary disabled

### 0.0.7
- importmagic is keeping cache between restarts
- importmagic set_style feature has implemented
- ctrl+alt+space trigger removed
- "Remove unused imports" has been removed (it isn't work properly)


## Roadmap
- Underline and remove unused imports. That would be good.
- When project or module path contain "test", symbols won't be collected


## License 
[MIT](LICENSE)

- Some parts of code based on https://github.com/DonJayamanne/pythonVSCode
- This extension based https://github.com/alecthomas/importmagic
- Also we use Whoosh https://bitbucket.org/mchaput/whoosh/overview
 
