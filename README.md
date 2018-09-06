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


When you want to force suggestions, press <kbd>ctrl</kbd> + <kbd>space</kbd> (See [IntelliSense features](https://code.visualstudio.com/docs/editor/intellisense#_intellisense-features) for more information)


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

> `"importMagic.indexRebuildPolicy"`  
ImportMagic can rebuild index each time when python files were changing (onSave). Or you can do it manually using "ImportMagic: Rebuild Index" from the Command Palette (manually).  
"onSave" by default.


## Install notes
- This extension need [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- You must have installed python interpretor (see **"python.pythonPath"** in your project settings)
- Remember: importmagic scan your files in root directory and **"python.autoComplete.extraPaths"** directories.


## Changelog
### 0.0.7
- importmagic is keeping cache between restarts
- importmagic set_style feature has implemented
- ctrl+alt+space trigger removed
- "Remove unused imports" has been removed (it isn't work properly)


## License 
[MIT](LICENSE)

Some parts of code based on https://github.com/DonJayamanne/pythonVSCode

This extension based https://github.com/alecthomas/importmagic
