<h1 align="center">
  <br>
    <img src="https://github.com/pilat/vscode-importmagic/blob/master/images/icon.png?raw=true" alt="logo" width="200">
  <br>
  vscode-importmagic
  <br>
  <br>
</h1>

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/brainfit.vscode-importmagic.svg)](https://marketplace.visualstudio.com/items?itemName=brainfit.vscode-importmagic) 
[![Build Status](https://travis-ci.org/pilat/vscode-importmagic.svg?branch=master)](https://travis-ci.org/pilat/vscode-importmagic)

## Find unresolved symbols in Python code.

This Visual Studio Code extension allow to find unresolved symbols in Python code and make import them.

As well, this extension will show suggestions from project symbols, when you press <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>space</kbd> and type class or method name.



![Demo](https://github.com/pilat/vscode-importmagic/blob/masterimages/presentation.gif?raw=true)


## HOWTO
- You must have installed python interpretor (see **python.pythonPath** in your project settings)
- Remember: importmagic scan your files in root directory and **python.autoComplete.extraPaths** directories.


## License 
[MIT](LICENSE)

Use some code from the https://github.com/DonJayamanne/pythonVSCode project

This extension based https://github.com/alecthomas/importmagic
