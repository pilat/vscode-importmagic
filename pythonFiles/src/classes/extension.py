import os
import sys
import importmagic
from src.classes.index_manager import IndexManager, DB_VERSION
from src.classes.indexer import DirIndexer, FileIndexer, QuickIndexer
from src.utils import md5_hash


class Extension(object):
    def __init__(self):
        self._style_multiline = 'backslash'
        self._style_max_columns = 79
        self._style_indent_with_tabs = False
        self._paths = []
        self._skip_tests = True
        self._temp_path = None
        self._workspace_hash = None
        self._index_manager = None

    @property
    def style_multiline(self):
        return self._style_multiline

    @style_multiline.setter
    def style_multiline(self, value):
        if value not in ('backslash', 'parentheses'):
            raise ValueError('Invalid style_multiline value')
        self._style_multiline = value

    @property
    def style_max_columns(self):
        return self._style_max_columns

    @style_max_columns.setter
    def style_max_columns(self, value):
        self._style_max_columns = int(value)

    @property
    def style_indent_with_tabs(self):
        return self._style_indent_with_tabs

    @style_indent_with_tabs.setter
    def style_indent_with_tabs(self, value):
        self._style_indent_with_tabs = bool(value)

    @property
    def paths(self):
        return self._paths

    @paths.setter
    def paths(self, value):
        if not isinstance(value, list):
            raise TypeError('Paths must be list')
        self._paths = value

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
    
    @property
    def workspace_hash(self):
        return self._workspace_hash

    @workspace_hash.setter
    def workspace_hash(self, value):
        self._workspace_hash = value

    @property
    def style(self):
        return dict(multiline=self.style_multiline,
            max_columns=self.style_max_columns,
            indent_with_tabs=self.style_indent_with_tabs)

    def notify_progress(self, text):
        self._success_response(progress=text)

    def _apply_settings(self, **kwargs):
        self.paths = kwargs.get('paths', [])
        self.skip_tests = kwargs.get('skipTest', True)
        self.temp_path = kwargs.get('tempPath')

        style_settings = kwargs.get('style', {})
        self.style_multiline = style_settings.get('multiline', 'backslash')
        self.style_max_columns = style_settings.get('maxColumns', 79)
        self.style_indent_with_tabs = \
            style_settings.get('indentWithTabs', False)

        if not self.paths:
            raise ValueError('Empty paths')

        if not self.temp_path:
            raise Exception('Empty temp_path')

        workspace_name = kwargs.get('workspaceName', 'default')
        self.workspace_hash = md5_hash(workspace_name)[:8]

    def _cmd_configure(self, **kwargs):
        if not self._index_manager:
            # First time
            self._apply_settings(**kwargs)

            self._index_manager = IndexManager(self.temp_path,
                                               self.workspace_hash)
            exists, py_ver, sys_modules_count, db_version = \
                self._index_manager.open()
            if not exists:
                self._cmd_rebuild_index()
            else:
                # Let's compare python version
                if py_ver != sys.version or db_version != DB_VERSION:
                    self._cmd_rebuild_index()
                else:
                    # Our file monitor isn't watching system packages.
                    # When user had installed new packages we should rebuild
                    # the index totally.
                    idx = QuickIndexer(self.paths, self.skip_tests)
                    idx.build(self._report_scan_progress)
                    if idx.total_system_files != sys_modules_count:
                        self._cmd_rebuild_index()
        else:
            # Settings were changed on-fly
            old_temp_path = self.temp_path
            old_paths = self.paths
            old_skip_tests = self.skip_tests
            self._apply_settings(**kwargs)
            
            if old_temp_path != self.temp_path or \
                self.paths != old_paths or \
                self.skip_tests != old_skip_tests:
                self._cmd_rebuild_index()

    def _report_scan_progress(self, value):
        self.notify_progress('Scan files: %i' % value)

    def _cmd_change_files(self, files, **kwargs):
        #pylint: disable=unused-argument
        if not self._index_manager:
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

        idx = FileIndexer(self.paths, prefiexes, self.skip_tests)
        idx.build(self._report_scan_progress)

        self.notify_progress('Update index...')
        self._index_manager.remove_from_index(idx)

        self._index_manager.append_index(idx)
        self.notify_progress('Save index...')
        self._index_manager.commit()

        all_docs_count = self._index_manager.get_documents_count()
        return dict(success=True, docs_count=all_docs_count)

    def _cmd_rebuild_index(self, **kwargs):
        #pylint: disable=unused-argument

        if not self._index_manager:
            raise Exception('Run configure() at first')
        
        self._index_manager.recreate_index()
        
        idx = DirIndexer(self.paths, self.skip_tests)
        idx.build(self._report_scan_progress)
        total_items = idx.get_power() or 1

        def report_listener2(value):
            v = value * 100 / total_items
            self.notify_progress('Build index: %i%%' % int(v))

        self._index_manager.append_index(idx, report_listener2)
        self.notify_progress('Save index...')
        self._index_manager.commit()

        # Save system packages count
        self._index_manager.save_config(idx.total_system_files)
        
        all_docs_count = self._index_manager.get_documents_count()
        return dict(success=True, docs_count=all_docs_count)

    def _cmd_get_symbols(self, text, **kwargs):
        #pylint: disable=unused-argument
        if not self._index_manager:
            raise Exception('Run configure() at first')
        if len(text) < 2:
            raise Exception('You should find at least 2-symbols text')

        results = []
        for f in self._index_manager.search(text):
            results.append(dict(
                symbol=f['symbol'],
                module=f['module'],
                kind=f['kind']
            ))

        return dict(items=results)

    def _cmd_insert_import(self, **kwargs):
        if not self._index_manager:
            raise Exception('Run configure() at first')

        source_file = kwargs.get('sourceFile')
        module = kwargs.get('module')
        symbol = kwargs.get('symbol')  # Always present

        if not source_file:
            raise ValueError('Empty sourceFile')
        
        with open(source_file, 'r') as fd:
            python_source = fd.read()
        
        # TODO: May be broken when starts with -OO
        imports = importmagic.Imports(self._index_manager, python_source)
        imports.set_style(**self.style)

        if not module:
            imports.add_import(symbol)
        else:
            imports.add_import_from(module, symbol)
        start, end, text = imports.get_update()
        return dict(fromLine=start, endLine=end, text=text)

    def _cmd_import_suggestions(self, **kwargs):
        if not self._index_manager:
            raise Exception('Run configure() at first')

        source_file = kwargs.get('sourceFile')
        unresolved_name = kwargs.get('unresolvedName')

        if len(unresolved_name) < 2:
            raise Exception('You should find at least 2-symbols text')
        
        if not source_file:
            raise ValueError('Empty sourceFile')

        if not unresolved_name:
            raise ValueError('Empty unresolvedName')

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

        # candidates = []
        # for score, module, variable in \
        #     self._index.symbol_scores(unresolved_name):
        #     candidates.append(dict(score=score, module=module,
        #                            variable=variable))
        #     if len(candidates) >= ITEMS_LIMIT:
        #         break

        # return dict(candidates=candidates)
    
    _COMMANDS = {
        'configure': _cmd_configure,
        'changeFiles': _cmd_change_files,
        'rebuildIndex': _cmd_rebuild_index,
        'getSymbols': _cmd_get_symbols,
        'insertImport': _cmd_insert_import,
        'importSuggestions': _cmd_import_suggestions
    }
