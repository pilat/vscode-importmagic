from os import path # import exists, join
from os import mkdir
import time
import json
import sys

from src.utils import to_unicode
from src.classes.schema import IndexSchema
from whoosh import index
from whoosh.qparser import QueryParser, plugins


DB_VERSION = 4


class IndexManager(object):
    def __init__(self, data_path, workspace_hash_name):
        self._report_listener = None
        self._last_report_time = 0
        self._total_items = 0
        self._writer = None
        
        # Create target temp path
        if not path.exists(data_path):
            mkdir(data_path)

        self._data_path = data_path
        self._workspace_hash_name = workspace_hash_name

        # Create workspace target path
        if not path.exists(self._get_path()):
            mkdir(self._get_path())

    def _get_path(self):
        return path.join(self._data_path, self._workspace_hash_name)

    def open(self):
        # Read settings file or set default values
        config_file_name = path.join(self._get_path(), 'config.json')
        cfg = {}
        try:
            with open(config_file_name, 'r') as f:
                cfg = json.load(f)
        except:
            pass
        
        # Open/create index
        exist = False
        try:
            self._open_index()
            exist = True
        except Exception:
            self.recreate_index()

        python_version = cfg.get('python_version', None)
        sys_modules_count = cfg.get('sys_modules_count', None)
        db_version = cfg.get('db_version', None)
        return exist, python_version, sys_modules_count, db_version

    def _open_index(self):
        self._ix = index.open_dir(self._get_path(), schema=IndexSchema)
    
    def recreate_index(self):
        self._ix = index.create_in(self._get_path(), schema=IndexSchema)

    def _add_document(self, filename, symbol, module, location, kind, 
                      score, **kwargs):
        self._writer.add_document(
            filename=to_unicode(filename),
            symbol=to_unicode(symbol),
            module=to_unicode(module),
            location=location,
            kind=kind,
            sort=score)
        
        self.total_items += 1

    @property
    def total_items(self):
        return self._total_items

    @total_items.setter
    def total_items(self, value):
        self._total_items = value
        
        ts = time.time()
        if ts - self._last_report_time > 0.3:
            self._last_report_time = ts
            if self._report_listener:
                self._report_listener(self.total_items)

    def append_index(self, indexer, report_listener=None):
        self._report_listener = report_listener
        self.total_items = 0

        if not self._writer:
            self._writer = self._ix.writer()

        if indexer.target_prefixes is not None:
            # Add without empty filenames ''
            def add_from_affected(filename, **kwargs):
                if filename not in indexer.affected_files:
                    return
                self._add_document(filename=filename, **kwargs)
            indexer.iterate(add_from_affected)
        else:
            indexer.iterate(self._add_document)

        if self._report_listener:
            # Report about final count
            self._report_listener(self.total_items)

    def remove_from_index(self, indexer):
        if not self._writer:
            self._writer = self._ix.writer()

        del_count = 0
        for filename in indexer.affected_files:
            qp = QueryParser('filename', schema=self._ix.schema, plugins=[])
            q = qp.parse(filename)
            del_count += self._writer.delete_by_query(q)
        return del_count

    def commit(self):
        if not self._writer:
            raise Exception('Writer is empty')
        self._writer.commit()
        self._writer = None

    def save_config(self, sys_modules_count):
        # Let's write json
        cfg = dict(python_version=sys.version, 
                   sys_modules_count=sys_modules_count,
                   db_version=DB_VERSION)
        config_file_name = path.join(self._get_path(), 'config.json')
        try:
            with open(config_file_name, 'w') as f:
                json.dump(cfg, f)
        except:
            return

    def search(self, pattern):
        qp = QueryParser('symbol', schema=self._ix.schema, plugins=[
            plugins.WildcardPlugin()])

        q = qp.parse('*%s*' % pattern)
        items = []
        with self._ix.searcher() as s:
            results = s.search(q, limit=50, sortedby='sort', reverse=True)
            for item in results:
                items.append(item.fields())
        return items

    def get_documents_count(self):
        return self._ix.searcher().doc_count()

    def location_for(self, path):
        # Find 1st module mentioned in index and detect location name
        qp = QueryParser('module', schema=self._ix.schema, plugins=[])
        q = qp.parse(path)
        location = '3'

        items = []
        with self._ix.searcher() as s:
            results = s.search(q, limit=1, sortedby='sort', reverse=True)
            if len(results) > 0:
                location = results[0]['location']
            s = 1
        return location
