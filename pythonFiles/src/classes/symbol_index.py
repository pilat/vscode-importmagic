import os
from contextlib import contextmanager
from importmagic import SymbolIndex


class SymbolIndexAccelerator(object):
    def path(self):
        if not hasattr(self, '_cached_path'):
            path = []
            node = self
            while node and node._name:
                path.append(node._name)
                node = node._parent
            setattr(self, '_cached_path', '.'.join(reversed(path)))
        return getattr(self, '_cached_path')

    def depth(self):
        if not hasattr(self, '_cached_depth'):
            depth = 0
            node = self
            while node._parent:
                depth += 1
                node = node._parent
            setattr(self, '_cached_depth', depth)
        return getattr(self, '_cached_depth')


class ExtendedSymbolIndex(SymbolIndex, SymbolIndexAccelerator):
    """
    Extend base class for keep a filename
    """
    def __init__(self, name=None, parent=None, score=1.0, location='L',
                 blacklist_re=None, locations=None, filename=None, 
                manager=None):
        self.filename = filename
        self.manager = manager
        super(ExtendedSymbolIndex, self).__init__(name, parent, score, 
            location, blacklist_re, locations)

    def get_power(self):
        items_count = 0
        for subscope in list(self._tree.values()):
            items_count += 1
            if type(subscope) is not float:
                items_count += subscope.get_power()
        return items_count

    def build_index(self):
        super(ExtendedSymbolIndex, self).build_index(self.manager.paths)
    
    def index_file(self, module, filename):
        location = self._determine_location_for(filename)
        if location in ('F', '3', 'S'):
            self.manager.total_system_files += 1
        self.manager.total_files += 1

        if self.manager.blacklist_re.search(filename):
            return

        if self.manager.target_prefixes is not None:
            ok = False
            for test_file in self.manager.target_prefixes:
                if filename.startswith(test_file):
                    ok = True
                    break
            if not ok:
                return
            self.manager.affected_files.add(filename)

        # logger.debug('parsing Python module %s for indexing', filename)
        with open(filename, 'rb') as fd:
            source = fd.read()
        with self.enter(module, 
            location=location,  # self._determine_location_for(filename), 
            filename=filename) as subtree:
            success = subtree.index_source(filename, source)
        if not success:
            self._tree.pop(module, None)

    def _index_package(self, root, location):
        root_filename = os.path.join(root, '__init__.py')

        basename = os.path.basename(root)
        with self.enter(basename, location=location, 
            filename=root_filename) as subtree:
            for filename in os.listdir(root):
                subtree.index_path(os.path.join(root, filename))
    
    @contextmanager
    def enter(self, name, location='L', score=1.0, filename=None):
        if name is None:
            tree = self
        else:
            tree = self._tree.get(name)
            if not isinstance(tree, SymbolIndex):
                tree = self._tree[name] = ExtendedSymbolIndex(name, self, 
                    score=score, location=location, filename=filename, 
                    manager=self.manager)
                if tree.path() in SymbolIndex._PACKAGE_ALIASES:
                    alias_path, _ = SymbolIndex._PACKAGE_ALIASES[tree.path()]
                    alias = self.find(alias_path)
                    alias._tree = tree._tree

        yield tree
        if tree._exports is not None:
            # Delete unexported variables
            for key in set(tree._tree) - set(tree._exports):
                del tree._tree[key]
