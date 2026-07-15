import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

ROUTES = {
    "/": "rightflush-home__3_.html",
    "/about": "rightflush-about.html",
    "/contact": "rightflush-contact-quote__1_.html",
    "/emergency": "rightflush-emergency.html",
    "/burst-pipe": "rightflush-burst-pipe-flooding.html",
    "/hot-water": "rightflush-service-pages__1_.html",
    "/blocked-drains": "rightflush-service-pages__1_.html",
    "/leak-detection": "rightflush-service-pages__1_.html",
    "/gas-plumbing": "rightflush-service-pages__1_.html",
    "/water-filtration": "rightflush-service-pages__1_.html",
    "/roofing": "rightflush-service-pages__1_.html",
    "/electrical": "rightflush-service-pages__1_.html",
    "/siding": "rightflush-service-pages__1_.html",
    "/stucco": "rightflush-service-pages__1_.html",
    "/brick": "rightflush-service-pages__1_.html",
    "/windows": "rightflush-service-pages__1_.html",
    "/doors": "rightflush-service-pages__1_.html",
    "/garage-doors": "rightflush-service-pages__1_.html",
    "/patio-doors": "rightflush-service-pages__1_.html",
    "/hvac": "rightflush-service-pages__1_.html",
    "/decks-fencing": "rightflush-service-pages__1_.html",
    "/space-conversions": "rightflush-service-pages__1_.html",
    "/home-additions": "rightflush-service-pages__1_.html",
    "/pipe-repair": "rightflush-service-pages__1_.html",
    "/bathroom-renos": "rightflush-bathroom-renovations.html",
    "/bathroom-renovations": "rightflush-bathroom-renovations.html",
    "/gallery": "rightflush-before-after-gallery.html",
    "/reviews": "rightflush-reviews.html",
    "/our-guarantee": "rightflush-our-guarantee.html",
    "/blog": "rightflush-blog__2_.html",
    "/faq": "rightflush-faq__2_.html",
    "/service-areas": "rightflush-service-areas.html",
    "/specials": "rightflush-specials.html",
    "/timmins": "rightflush-market-pages.html",
    "/south-porcupine": "rightflush-market-pages.html",
    "/iroquois-falls": "rightflush-market-pages.html",
    "/cochrane": "rightflush-market-pages.html",
    "/matheson": "rightflush-market-pages.html",
    "/kapuskasing": "rightflush-market-pages.html",
    "/kirkland-lake": "rightflush-market-pages.html",
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"
        if path in ROUTES:
            self.path = "/" + ROUTES[path]
        # Inject the ClearSky live-monitoring HUD into HTML responses. The HTML
        # files on disk are never modified — the <script> tag is added only in
        # the served bytes, so it's a pure demo overlay.
        fpath = os.path.join(ROOT, self.path.lstrip("/"))
        if (fpath.endswith(".html") and os.path.isfile(fpath)
                and os.path.abspath(fpath).startswith(ROOT)):
            with open(fpath, "rb") as fh:
                body = fh.read()
            if b"_clearsky-hud.js" not in body:
                tag = b'<script src="/_clearsky-hud.js"></script>'
                idx = body.rfind(b"</body>")
                body = (body[:idx] + tag + body[idx:]) if idx != -1 else body + tag
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving RightFlush site at http://127.0.0.1:{PORT}/")
        httpd.serve_forever()
