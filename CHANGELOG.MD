Changelog
=========
### 0.2.6 - Febrary 11, 2020
- Fix issue with watching files in multiple workspace
- Refactoring

### 0.2.5 - December 30, 2019
- 'importMagic.skipTestFolders' configuration option was implemented
- Behavior with not configured `extraPaths` was improved (again)
- Whoosh was upgraded to 2.7.4

### 0.2.4 - September 13, 2019
- Fix path scanning for projects without `extraPaths` setting

### 0.2.3 - August 2, 2019
- Fix temporary directory creation

### 0.2.2 - July 30, 2019
- dependencies were added as submodules

### 0.2.0 - July 30, 2019
- isort was upgraded to 4.3.21 what means Python2 isn't support anymore

### 0.1.4 - July 10, 2019
- Show progress as a notification

### 0.1.3 - Febrary 8, 2019
- quick fix Multi-root workspaces supporting

### 0.1.2 - January 21, 2019
- Some module could have __all__ list. Modules from there will be placed to indexing

### 0.1.1 - January 21, 2019 - hotfix
- If project didn't have any import, the first import wouldn't insert

### 0.1.0 - January 21, 2019
- Import statements will be made using iSort. You can use .isort.cfg in your project

### 0.0.10 - October 5, 2018
- Working with Multi-root Workspaces was fixed
- Minor changes

### 0.0.9 - October 3, 2018
- Implements Whoosh indexing and searching library.
- Partial index renew while files were changing.

### 0.0.8 - September 11, 2018
- Importmagic index cache feature was temporary disabled

### 0.0.7 - September 6, 2018
- importmagic is keeping cache between restarts
- importmagic set_style feature has implemented
- ctrl+alt+space trigger removed
- "Remove unused imports" has been removed (it isn't work properly)

