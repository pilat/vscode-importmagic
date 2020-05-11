import os
import locale

from difflib import SequenceMatcher

# from pathlib import Path
try:
    from pathlib import Path
except ImportError:
    # Python 2 backport
    from pathlib2 import Path

from isort import settings
from isort.isort import _SortImports
from isort.compat import (
    get_settings_path,
    resolve,
    determine_file_encoding,
    read_file_contents
)

class SortImportsException(Exception):
    pass


class ExtendedSortImports(object):
    def __init__(self, file_path, settings_path):
        self._file_path = file_path
        self._settings_path = settings_path
        self._import_candidates = []
        self.output = None

    def add_import(self, from_, module_=None):
        self._import_candidates.append('from %s import %s' % (from_, module_) \
            if module_ is not None else 'import %s' % from_)

    def get_diff(self, **setting_overrides):
        # Follow code is a modified part of isort.compat.SortImports
        run_path=''
        check_skip=True
        
        if not self._file_path:
            return []

        file_path = Path(self._file_path)
        settings_path = None if self._settings_path is None else \
            Path(self._settings_path)
        self.config = settings.prepare_config(
            get_settings_path(settings_path, file_path), **setting_overrides)
        
        # Add custom import
        self.config['add_imports'] = self.config['add_imports'] or []
        for c in self._import_candidates:
            self.config['add_imports'].append(c)

        absolute_file_path = resolve(file_path)
        file_name = None
        if check_skip:
            if run_path and run_path in absolute_file_path.parents:
                file_name = os.path.relpath(absolute_file_path, run_path)
            else:
                file_name = str(absolute_file_path)
                run_path = ''

            if settings.file_should_be_skipped(file_name, self.config, run_path):
                raise SortImportsException(
                    "%s was skipped as it's listed in 'skip' setting or "
                    "matches a glob in 'skip_glob' setting" % \
                    absolute_file_path)
    
        preferred_encoding = determine_file_encoding(absolute_file_path)
        fallback_encoding = locale.getpreferredencoding(False)
        file_contents, used_encoding = read_file_contents(
            absolute_file_path, encoding=preferred_encoding,
            fallback_encoding=fallback_encoding)
        if used_encoding is None:
            raise SortImportsException(
                "%s was skipped as it couldn't be opened with the given "
                "%s encoding or %s fallback encoding" % (
                    str(absolute_file_path), preferred_encoding,
                    fallback_encoding))

        if file_contents is None or ("isort:" + "skip_file") in file_contents:
            return []

        extension = file_name.split('.')[-1] if file_name else "py"
        self.sorted_imports = _SortImports(
            file_contents=file_contents,
            config=self.config,
            extension=extension
        )
        self.output = self.sorted_imports.output

        # END. compare file_contents vs self.output
        return self._show_diff(file_contents)

    def _show_diff(self, file_contents):
        diff_commands = []
        s1 = file_contents.splitlines(1)
        s2 = self.output.splitlines(1)
        if s2[-1].endswith('\n') and not s1[-1].endswith('\n'):
            s1[-1] += '\n'

        # Parse our diff
        matcher = SequenceMatcher(None, s1, s2)
        for tag, i1, i2, j1, j2 in reversed(matcher.get_opcodes()):
            if tag == 'delete':
                diff_commands.append({
                    'action': 'delete',
                    'start': i1,
                    'end': i2,
                    'text': None
                })
            elif tag == 'insert':
                diff_commands.append({
                    'action': 'insert',
                    'start': i1,
                    'end': i2,
                    'text': ''.join(s2[j1:j2])
                })
            elif tag == 'replace':
                diff_commands.append({
                    'action': 'replace',
                    'start': i1,
                    'end': i2,
                    'text': ''.join(s2[j1:j2])
                })
        return diff_commands
