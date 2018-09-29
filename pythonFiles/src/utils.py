import sys


def to_unicode(v):
    return unicode(v) if sys.version_info[0] == 2 else v
