import sys
import io
import json
import traceback

from src.extension import Extension
from src.utils import pipeout
from src import WarningException


class ImportMagicDaemon(Extension):
    def __init__(self):
        self._input = io.open(sys.stdin.fileno(), encoding='utf-8')
        super().__init__()

    def _process_request(self, request):
        action = request.get('action')
        cmd = Extension._COMMANDS.get(action)
        if not cmd:
            raise WarningException('Invalid action')
        result = cmd(self, **request)
        return result if isinstance(result, dict) else dict(success=True)

    def _error_response(self, **response):
        pipeout(sys.stderr, response)

    def _success_response(self, **response):
        pipeout(sys.stdout, response)

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
            except WarningException as e:
                # daemon will be work
                json_message = dict(error=True, id=request_id, message=str(e))
                self._error_response(**json_message)
            except:
                # daemon will be terminated
                exc_type, exc_value, exc_tb = sys.exc_info()
                tb_info = traceback.extract_tb(exc_tb)
                json_message = dict(
                    error=True, id=request_id, message=str(exc_value), 
                    traceback=str(tb_info), type=str(exc_type))
                self._error_response(**json_message)
                exit(102)
