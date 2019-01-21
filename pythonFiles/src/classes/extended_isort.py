import os

from collections import OrderedDict
from difflib import unified_diff, SequenceMatcher

from isort.isort import SortImports
from isort.pie_slice import OrderedSet


class ExtendedSortImports(SortImports):
    def __init__(self, file_path, settings_path):
        self._file_path = file_path
        self._settings_path = settings_path
        self._import_candidates = []
        self._diff_commands = []

    def add_import(self, from_, module=None):
        self._import_candidates.append((from_, module))

    def get_diff(self, **setting_overrides):
        self._native_init(file_path=self._file_path,
            settings_path=self._settings_path, show_diff=True,
            **setting_overrides)
        return self._diff_commands

    def _parse(self):
        self._apply_imports()
        super(ExtendedSortImports, self)._parse()
        if self.import_index == -1 and self._import_candidates:
            self.import_index = 0

    def _show_diff(self, file_contents):
        s1 = file_contents.splitlines(1)
        s2 = self.output.splitlines(1)
        if s2[-1].endswith('\n') and not s1[-1].endswith('\n'):
            s1[-1] += '\n'

        # Parse our diff
        matcher = SequenceMatcher(None, s1, s2)
        for tag, i1, i2, j1, j2 in reversed(matcher.get_opcodes()):
            if tag == 'delete':
                self._diff_commands.append({
                    'action': 'delete',
                    'start': i1,
                    'end': i2,
                    'text': None
                })
            elif tag == 'insert':
                self._diff_commands.append({
                    'action': 'insert',
                    'start': i1,
                    'end': i2,
                    'text': ''.join(s2[j1:j2])
                })
            elif tag == 'replace':
                self._diff_commands.append({
                    'action': 'replace',
                    'start': i1,
                    'end': i2,
                    'text': ''.join(s2[j1:j2])
                })

    def _apply_imports(self):
        for import_from_, module_ in self._import_candidates:
            import_type = 'from' if module_ is not None else 'straight'

            placed_module = self.place_module(import_from_)
            if import_type == "from":
                root = self.imports[placed_module][import_type]
                # if import_from_ not in root:
                #     root[import_from_] = OrderedDict()
                # root[import_from_].update([(module_, None)])
                if root.get(import_from_, False):
                    root[import_from_].update([module_])
                else:
                    root[import_from_] = OrderedSet([module_])
            else:
                module_ = import_from_
                # self.imports[placed_module][import_type][module_] = None
                self.imports[placed_module][import_type].add(module_)


ExtendedSortImports._native_init = SortImports.__init__
