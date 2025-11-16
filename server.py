import http.server
import socketserver

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

PORT = 8000

with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
