import sys
from hashlib import md5


def to_unicode(v):
    return unicode(v) if sys.version_info[0] == 2 else v

def md5_hash(v):
    return md5(v.encode()).hexdigest()
