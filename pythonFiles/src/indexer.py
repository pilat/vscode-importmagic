import re
import sys
import time
import importmagic
from src.symbol_index import ExtendedSymbolIndex


class Indexer(object):  # Manager for ExtendedSymbolIndex
    def __init__(self, paths, skip_tests=True, ignore_folders=None):
        self.target_prefixes = None
        self.affected_files = set()  # Uses when target_prefixes was set
        self._last_report_time = 0
        self._report_listener = None
        self.total_files = 0

        if ignore_folders is not None:
            start_regex = (
                r'\btest[s]?|test[s]?\b' if skip_tests else r''
            )
            folder_regex = [
                r'\b' + folder + r'\b' for folder in ignore_folders
            ]
            regex = r"|".join([start_regex, *folder_regex])
            self.blacklist_re = re.compile(regex)
        elif skip_tests:
            self.blacklist_re = importmagic.index.DEFAULT_BLACKLIST_RE
        else:
            self.blacklist_re = re.compile(r'^$')

        self.paths = list(set(paths + sys.path))
        
        for s in list(self.paths):
            # Remove this plugin paths
            if 'vscode-importmagic' in s or s == '':
                self.paths.remove(s)
        
        self._index = ExtendedSymbolIndex(manager=self)
        
        ts = time.time()
        if ts - self._last_report_time > 0.3:
            self._last_report_time = ts
            if self._report_listener:
                self._report_listener(self.total_files)

    def build(self, report_listener=None):
        self._report_listener = report_listener
        self._index.build_index()
    
    def get_power(self):
        return self._index.get_power()
    
    # def __iter__(self):  # Unfortually python 2 doesn't know "yield from"
    def iterate(self, callback):
        return self._scan_tree(self._index, 1.0, callback)

    def _scan_tree(self, scope, scale, callback):
        for key, subscope in scope._tree.items():
            score = None
            if type(subscope) is not float:
                self._scan_tree(subscope, 
                    subscope.score * scale - 0.1, callback)
                score = subscope.score
            else:
                score = subscope

            kind = 'T'  # Text
            if score == 1.1 or score == 1.2:
                kind = 'C'  # Class
            if score == 0.25:
                kind = 'R'  # Reference
            if score == 1.2:
                kind = 'F'  # Function
            if score == 1:
                kind = 'M'  # Module;

            if '.' in key:
                # Sometimes references from the others modules or bad-named 
                # modules (for example "core.tmp" with __init__.py inside)
                # can be there. We should skip it
                continue
            
            callback(symbol=key, depth=scope.depth(),
                filename=scope.filename or '', module=scope.path(),
                location=scope.location, score=int(score * scale * 1000),
                kind=kind)


class DirIndexer(Indexer):
    def __init__(self, paths, skip_tests=True, ignore_folders=None):
        super().__init__(paths, skip_tests, ignore_folders)


class FileIndexer(Indexer):
    def __init__(self, paths, prefixes, skip_tests=True, ignore_folders=None):
        super().__init__(paths, skip_tests, ignore_folders)
        self.target_prefixes = prefixes


class QuickIndexer(Indexer):
    def __init__(self, paths, skip_tests=True, ignore_folders=None):
        super().__init__(paths, skip_tests, ignore_folders)
        self.target_prefixes = []
