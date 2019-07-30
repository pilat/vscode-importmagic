from hashlib import md5
import json


def md5_hash(v):
    return md5(v.encode()).hexdigest()


def pipeout(pipe, response):
    pipe.write(json.dumps(response))
    pipe.write('\n')
    pipe.flush()
