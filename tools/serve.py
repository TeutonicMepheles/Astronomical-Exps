from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import argparse

ROOT = Path(__file__).resolve().parents[1]
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8793)
    parser.add_argument('--experiment', choices=['newton-telescope', 'light-pollution', 'components'], default='newton-telescope')
    args = parser.parse_args()
    route = 'previews/components' if args.experiment == 'components' else 'experiments/' + args.experiment
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    print(f'http://127.0.0.1:{server.server_port}/{route}/', flush=True)
    server.serve_forever()
