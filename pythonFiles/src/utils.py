import sys
from hashlib import md5
import json


def to_unicode(v):
    return unicode(v) if sys.version_info[0] == 2 else v


def md5_hash(v):
    return md5(v.encode()).hexdigest()


def pipeout(pipe, response):
    pipe.write(json.dumps(response))
    pipe.write('\n')
    pipe.flush()
