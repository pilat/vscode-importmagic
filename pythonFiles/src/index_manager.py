import sys
import time
from os import makedirs, path

from src.indexer import QuickIndexer
from src.schema import IndexSchema
from src.utils import md5_hash
from whoosh import index
from whoosh.qparser import QueryParser, plugins

DB_VERSION = 7


class IndexManager(object):
    def __init__(self, extension, workspace_name):
        self._extension = extension
        self._workspace_hash_name = md5_hash(workspace_name)[:8]
        self._report_listener = None
        self._last_report_time = 0
        self._total_items = 0
        self._writer = None

        # Create target temp path
        data_path = self._get_path()
        try:
            makedirs(data_path)
        except OSError as e:
            pass

    def _get_path(self):
        return path.join(self._extension.temp_path, self._workspace_hash_name)

    def _read_checksum(self):
        checksum = None
        try:
            with open(path.join(self._get_path(), '_checksum'), 'r') as f:
                checksum = f.read(512)
        except:
            pass
        return checksum

    def _write_checksum(self, checksum):
        try:
            with open(path.join(self._get_path(), '_checksum'), 'w') as f:
                f.write(checksum)
        except:
            pass

    def open(self):
        # Quickly count files in project (include system files)
        idx = QuickIndexer(self._extension.paths, self._extension.skip_tests)
        idx.build()

        db_checksum = md5_hash('%s+%s+%s+%s' % (
             '+'.join(self._extension.paths),
             sys.version,
             DB_VERSION,
             idx.total_files))
        if self._read_checksum() != db_checksum:
            return

        # Trying to open
        try:
            self._open_index()
        except Exception:
            return
        return True

    def _open_index(self):
        self._ix = index.open_dir(self._get_path(), schema=IndexSchema)
    
    def recreate_index(self):
        self._ix = index.create_in(self._get_path(), schema=IndexSchema)

    def _add_document(self, filename, symbol, module, location, kind, 
                      score, **kwargs):
        self._writer.add_document(
            filename=filename,
            symbol=symbol,
            module=module,
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

    def commit(self, total_files=None):
        if not self._writer:
            raise Exception('Writer is empty')
        self._writer.commit()
        self._writer = None

        if total_files is not None:
            db_checksum = md5_hash('%s+%s+%s+%s' % (
                '+'.join(self._extension.paths),
                sys.version,
                DB_VERSION,
                total_files))
            self._write_checksum(db_checksum)


    # def save_config(self, sys_modules_count):
    #     # Let's write json
    #     cfg = dict(python_version=sys.version, 
    #                sys_modules_count=sys_modules_count,
    #                db_version=DB_VERSION)
    #     config_file_name = path.join(self._get_path(), 'config.json')
    #     try:
    #         with open(config_file_name, 'w') as f:
    #             json.dump(cfg, f)
    #     except:
    #         return

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
