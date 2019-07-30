import os
import sys


sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'isort'))
sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'whoosh', 'src'))
sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'importmagic'))


PY2 = sys.version_info[0] == 2


if __name__ == '__main__':
    if PY2:
        exit(101)

    from src.daemon import ImportMagicDaemon
    ImportMagicDaemon().watch()
