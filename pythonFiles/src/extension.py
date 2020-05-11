import os

import importmagic
from isort.settings import WrapModes
from src import WarningException
from src.extended_isort import ExtendedSortImports
from src.index_manager import IndexManager
from src.indexer import DirIndexer, FileIndexer


class Extension(object):
    def __init__(self):
        self._inited = False

        self._style_multiline = None
        self._style_max_columns = None
        self._style_indent_with_tabs = None

        self._workspace_path = None  # .isort.cfg could be placed there
        self._paths = []
        self._ignore_folders = []
        self._skip_tests = True
        self._temp_path = None
        self._index_manager = None

    @property
    def style_multiline(self):
        return self._style_multiline

    @style_multiline.setter
    def style_multiline(self, value):
        if value in (None, 'backslash', 'parentheses'):
            self._style_multiline = value

    @property
    def style_max_columns(self):
        return self._style_max_columns

    @style_max_columns.setter
    def style_max_columns(self, value):
        if value is None or isinstance(value, int):
            self._style_max_columns = value
        elif isinstance(value, str) and value.isnumeric():
            self._style_max_columns = int(value)

    @property
    def style_indent_with_tabs(self):
        return self._style_indent_with_tabs

    @style_indent_with_tabs.setter
    def style_indent_with_tabs(self, value):
        if value is None or isinstance(value, bool):
            self._style_indent_with_tabs = value

    @property
    def paths(self):
        return self._paths

    @paths.setter
    def paths(self, value):
        if not isinstance(value, list):
            raise TypeError('Paths must be list')
        self._paths = value

    @property
    def ignore_folders(self):
        return self._ignore_folders

    @ignore_folders.setter
    def ignore_folders(self, value):
        if not isinstance(value, list):
            raise TypeError('ignore folders must be list')
        self._ignore_folders = value

    @property
    def workspace_path(self):
        return self._workspace_path

    @workspace_path.setter
    def workspace_path(self, value):
        self._workspace_path = value

    @property
    def skip_tests(self):
        return self._skip_tests

    @skip_tests.setter
    def skip_tests(self, value):
        self._skip_tests = bool(value)

    @property
    def temp_path(self):
        return self._temp_path

    @temp_path.setter
    def temp_path(self, value):
        self._temp_path = value
    
    def notify_progress(self, text):
        self._success_response(progress=text)

    def _cmd_configure(self, **kwargs):
        if self._inited:
            raise Exception('Restart to reconfigure it')

        self.paths = kwargs.get('paths', [])
        self.ignore_folders = kwargs.get('ignoreFolders', [])
        self.skip_tests = bool(kwargs.get('skipTest', True))
        self.temp_path = kwargs.get('tempPath')
        self.workspace_path = kwargs.get('workspacePath')

        style_settings = kwargs.get('style', {})
        self.style_multiline = style_settings.get('multiline')
        self.style_max_columns = style_settings.get('maxColumns')
        self.style_indent_with_tabs = style_settings.get('indentWithTabs')

        if not self.temp_path:
            raise ValueError('Empty temp_path')

        if not self.paths and os.path.exists(self.workspace_path):
            self.paths.append(self.workspace_path)

        self._inited = True
        self.notify_progress('Index checking in progress...')

        self._index_manager = IndexManager(
            self, kwargs.get('workspaceName', 'default'))

        if not self._index_manager.open():
            self._cmd_rebuild_index()

    def _report_scan_progress(self, value):
        self.notify_progress('Scan files... %i' % value)

    def _cmd_change_files(self, files, **kwargs):
        #pylint: disable=unused-argument
        if not self._inited:
            raise Exception('Run configure() at first')

        # When __init__.py was changed we should rescan the all packages
        # which placed under it. We will be use pathes as target prefixes
        prefiexes = []
        for f in list(files):
            prefiexes.append(f)
            basename = os.path.basename(f)
            if basename == '__init__.py':
                parts = f.split(os.path.sep)
                if len(parts) > 1:
                    package_path = os.path.sep.join(parts[:-1])
                    prefiexes.append(package_path)

        idx = FileIndexer(
            self.paths, prefiexes, self.skip_tests, self.ignore_folders
        )
        idx.build(self._report_scan_progress)

        self._index_manager.remove_from_index(idx)

        self._index_manager.append_index(idx)
        self._index_manager.commit(idx.total_files)

        all_docs_count = self._index_manager.get_documents_count()
        return dict(success=True, docs_count=all_docs_count)

    def _cmd_rebuild_index(self, **kwargs):
        #pylint: disable=unused-argument

        if not self._inited:
            raise Exception('Run configure() at first')
        self.notify_progress('Rebuild index...')
        
        self._index_manager.recreate_index()
        
        idx = DirIndexer(self.paths, self.skip_tests, self.ignore_folders)
        idx.build(self._report_scan_progress)
        total_items = idx.get_power() or 1

        def report_listener2(value):
            v = value * 100 / total_items
            self.notify_progress('Indexing... %i%%' % int(v))

        self._index_manager.append_index(idx, report_listener2)
        self.notify_progress('Save index file...')
        self._index_manager.commit(idx.total_files)

        all_docs_count = self._index_manager.get_documents_count()
        return dict(success=True, docs_count=all_docs_count)

    def _cmd_get_symbols(self, text, **kwargs):
        #pylint: disable=unused-argument
        if not self._inited:
            raise Exception('Run configure() at first')

        if len(text) < 2:
            raise WarningException('You should find at least 2-symbols text')

        results = []
        for f in self._index_manager.search(text):
            results.append(dict(
                symbol=f['symbol'],
                module=f['module'],
                kind=f['kind']
            ))

        return dict(items=results)

    def _cmd_insert_import(self, **kwargs):
        if not self._inited:
            raise Exception('Run configure() at first')

        source_file = kwargs.get('sourceFile')
        module = kwargs.get('module')
        symbol = kwargs.get('symbol')  # Always present
        if not source_file:
            raise WarningException('Empty sourceFile')

        isort = ExtendedSortImports(source_file, self.workspace_path)
        if not module:
            isort.add_import(symbol)
        else:
            isort.add_import(module, symbol)

        params = {'verbose': False}
        if self.style_max_columns is not None:
            params['line_length'] = self.style_max_columns
        if self.style_multiline == 'backslash':
            params['use_parentheses'] = False
            params['multi_line_output'] = WrapModes.HANGING_INDENT
        if self.style_multiline == 'parentheses':
            params['use_parentheses'] = True
            params['multi_line_output'] = WrapModes.GRID
        if self.style_indent_with_tabs is not None:
            params['indent'] = '\t' if self.style_indent_with_tabs else ' '*4

        diff = isort.get_diff(**params)
        return dict(diff=diff)
        

    def _cmd_import_suggestions(self, **kwargs):
        if not self._inited:
            raise Exception('Run configure() at first')

        source_file = kwargs.get('sourceFile')
        unresolved_name = kwargs.get('unresolvedName')

        if len(unresolved_name) < 2:
            raise WarningException('You should find at least 2-symbols text')
        
        if not source_file:
            raise WarningException('Empty sourceFile')

        if not unresolved_name:
            raise WarningException('Empty unresolvedName')

        with open(source_file, 'r') as fd:
            python_source = fd.read()
        scope = importmagic.Scope.from_source(python_source)

        _unresolved, _unreferenced = \
                            scope.find_unresolved_and_unreferenced_symbols()

        # Sometimes unresolved may contain "sys.path".
        # Split this cases for find "sys.path", "sys" and "path"
        unresolved = set()
        for item1 in _unresolved:
            for item2 in item1.split('.'):
                unresolved.add(item2)

        if unresolved_name not in unresolved:
            return dict(items=[])

        results = []
        for f in self._index_manager.search(unresolved_name):
            results.append(dict(
                symbol=f['symbol'],
                module=f['module'],
                kind=f['kind']
            ))

        return dict(items=results)

    _COMMANDS = {
        'configure': _cmd_configure,
        'changeFiles': _cmd_change_files,
        'rebuildIndex': _cmd_rebuild_index,
        'getSymbols': _cmd_get_symbols,
        'insertImport': _cmd_insert_import,
        'importSuggestions': _cmd_import_suggestions
    }
