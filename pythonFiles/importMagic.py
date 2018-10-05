import os
import sys
import io
import json
import sys
import traceback

# Add libs into sys.path
sys.path.insert(0, os.path.join(os.getcwd(), 'libs'))

from src.classes.extension import Extension


class ImportMagicDaemon(Extension):
    def __init__(self, daemon):
        self._input = io.open(sys.stdin.fileno(), encoding='utf-8')
        self._daemon = daemon
        super(ImportMagicDaemon, self).__init__()

    def _process_request(self, request):
        action = request.get('action')
        cmd = Extension._COMMANDS.get(action)
        if not cmd:
            raise ValueError('Invalid action')
        result = cmd(self, **request)
        return result if isinstance(result, dict) else dict(success=True)

    def _error_response(self, **response):
        sys.stderr.write(json.dumps(response))
        sys.stderr.write('\n')
        sys.stderr.flush()

    def _success_response(self, **response):
        sys.stdout.write(json.dumps(response))
        sys.stdout.write('\n')
        sys.stdout.flush()

    def watch(self):
        while True:
            try:
                request = json.loads(self._input.readline())
                request_id = request.get('requestId')

                if not request_id:
                    raise ValueError('Empty request id')

                response = self._process_request(request)
                json_message = dict(id=request_id, **response)
                self._success_response(**json_message)
            except:
                exc_type, exc_value, exc_tb = sys.exc_info()
                tb_info = traceback.extract_tb(exc_tb)
                json_message = dict(
                    error=True, id=request_id, message=str(exc_value), 
                    traceback=str(tb_info), type=str(exc_type))
                self._error_response(**json_message)
                if not self._daemon:
                    break


if __name__ == '__main__':
    # Extension starts the daemon with -d
    ImportMagicDaemon('-d' in sys.argv).watch()
