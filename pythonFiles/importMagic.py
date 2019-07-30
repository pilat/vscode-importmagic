import os
import sys


sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'isort-4.3.21'))
sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'whoosh-2.7.0', 'src'))
sys.path.insert(0, os.path.join(os.getcwd(), 'libs', 'importmagic-patched'))
# sys.path.insert(0, os.path.join(os.getcwd(),
#     'libs', 'importmagic-c00f2b282d933e0a9780146a20792f9e31fc8e6f'))


PY2 = sys.version_info[0] == 2


if __name__ == '__main__':
    if PY2:
        exit(101)

    from src.daemon import ImportMagicDaemon
    ImportMagicDaemon().watch()
