"""
Pocketfolio server

What it does:
  1. Shows your app (index.html, app.jsx, app.css) in the browser.
  2. /api/quotes  -> prices for Indian (NSE) stocks and the market indexes.
  3. /api/search  -> looks up NSE stocks by name or ticker.
  4. /api/chart   -> candle data (open/high/low/close/volume) for the charts.
  5. Draws the app icons (so there are no picture files to upload).

Why do we need it? Browsers are not allowed to ask Yahoo for prices directly.
Python programs are, so Python fetches the data and passes it on.

Run it on your own computer:   python server.py      (Mac: python3 server.py)
Run it on the internet:        a host like Render runs "python server.py" for you.
                               It sets a PORT variable, and this file notices it.

This file only uses things that come with Python. Nothing to install.
"""

import gzip
import json
import math
import os
import re
import struct
import threading
import time
import webbrowser
import zlib
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen

FOLDER = os.path.dirname(os.path.abspath(__file__))

# On a host like Render, a PORT variable is provided and the server must be
# reachable from outside. On your own computer it stays private to you.
ON_CLOUD = "PORT" in os.environ
PORT = int(os.environ.get("PORT", "8000"))
HOST = "0.0.0.0" if ON_CLOUD else "127.0.0.1"

CACHE_SECONDS = 20         # don't ask Yahoo again for the same stock within 20 seconds
MAX_SYMBOLS = 40           # most stocks one request may ask for
RATE_LIMIT = 90            # most API requests one visitor may make per minute
UPSTREAM_PER_MINUTE = 240  # most calls this whole server makes to Yahoo per minute

# NSE tickers are letters, digits, "&" and "-" (like M&M or BAJAJ-AUTO).
# Anything else is rejected, so nobody can sneak odd text into a web address.
SYMBOL_OK = re.compile(r"^[A-Z0-9&-]{1,20}$")

# Market indexes. App id -> (Yahoo ticker, display name).
INDICES = {
    "NIFTY50": ("^NSEI", "Nifty 50"),
    "SENSEX": ("^BSESN", "Sensex"),
    "BANKNIFTY": ("^NSEBANK", "Bank Nifty"),
    "NIFTYIT": ("^CNXIT", "Nifty IT"),
}

# Chart buttons -> (how far back, size of each candle) in Yahoo's words.
RANGES = {
    "1D": ("1d", "5m"),
    "5D": ("5d", "15m"),
    "1M": ("1mo", "1d"),
    "6M": ("6mo", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
}

# The only files the website is allowed to hand out. Everything else is a 404,
# so your server code can never be downloaded by visitors.
STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/app.jsx": ("app.jsx", "text/javascript; charset=utf-8"),
    "/app.css": ("app.css", "text/css; charset=utf-8"),
    "/sw.js": ("sw.js", "text/javascript; charset=utf-8"),
    "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json"),
}

# App icons are drawn by this file: path -> (size in pixels, full-bleed square?)
ICONS = {
    "/icon-192.png": (192, False),
    "/icon-512.png": (512, False),
    "/icon-maskable-512.png": (512, True),
    "/apple-touch-icon.png": (180, True),
}

_cache = {}        # symbol -> (time fetched, quote)
_chart_cache = {}  # (symbol, range) -> (time fetched, chart data)
_file_cache = {}   # file name -> (modified time, raw bytes, gzipped bytes)
_icon_cache = {}   # path -> png bytes
_hits = {}         # visitor -> times of recent API requests
_upstream_times = []
_lock = threading.Lock()


# ---------------------------------------------------------------- safety nets


def prune(cache, limit=1000):
    """Keep a cache from growing forever: drop the oldest entries."""
    if len(cache) > limit:
        for key in sorted(cache, key=lambda k: cache[k][0])[: limit // 4]:
            cache.pop(key, None)


def visitor_is_too_busy(visitor):
    now = time.time()
    with _lock:
        recent = [t for t in _hits.get(visitor, []) if now - t < 60]
        recent.append(now)
        _hits[visitor] = recent
        if len(_hits) > 5000:
            for key in [k for k, v in _hits.items() if not v or now - v[-1] > 60]:
                _hits.pop(key, None)
        return len(recent) > RATE_LIMIT


def upstream_allowed():
    """Stops us from hammering Yahoo, which could get this server blocked."""
    now = time.time()
    with _lock:
        while _upstream_times and now - _upstream_times[0] > 60:
            _upstream_times.pop(0)
        if len(_upstream_times) >= UPSTREAM_PER_MINUTE:
            return False
        _upstream_times.append(now)
        return True


# ---------------------------------------------------------------- price data


def get_json(url):
    if not upstream_allowed():
        raise RuntimeError("busy: too many price lookups right now, try again in a minute")
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


def yahoo_ticker(symbol):
    """Our name for something -> the name Yahoo uses."""
    if symbol in INDICES:
        return INDICES[symbol][0]
    return symbol + ".NS"  # ".NS" means NSE (National Stock Exchange)


def fetch_quote(symbol):
    """Ask Yahoo for one stock: price, yesterday's close, and today's 5-minute prices."""
    now = time.time()
    hit = _cache.get(symbol)
    if hit and now - hit[0] < CACHE_SECONDS:
        return hit[1]

    # quote() makes characters like "&" and "^" safe for web addresses.
    ticker = quote(yahoo_ticker(symbol), safe="")
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{ticker}?interval=5m&range=1d"
    )
    data = get_json(url)

    result = data["chart"]["result"][0]
    meta = result["meta"]
    closes = result["indicators"]["quote"][0]["close"]
    closes = [c for c in closes if c is not None]

    result_quote = {
        "price": meta["regularMarketPrice"],
        "prevClose": meta.get("chartPreviousClose") or meta.get("previousClose"),
        "history": closes[-30:],
        "name": INDICES[symbol][1]
        if symbol in INDICES
        else (meta.get("shortName") or meta.get("longName") or symbol),
    }
    _cache[symbol] = (now, result_quote)
    prune(_cache)
    return result_quote


def get_quotes(symbols):
    """Fetch several stocks at the same time so it's quick."""
    quotes, errors = {}, {}

    def work(symbol):
        try:
            quotes[symbol] = fetch_quote(symbol)
        except Exception as error:  # one failing stock shouldn't break the rest
            errors[symbol] = str(error)

    if symbols:
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(work, symbols))
    return quotes, errors


def parse_chart(symbol, range_key, interval, data):
    """Turn Yahoo's chart answer into a simple list of candles."""
    result = data["chart"]["result"][0]
    meta = result["meta"]
    stamps = result.get("timestamp") or []
    q = result["indicators"]["quote"][0]
    volumes = q.get("volume") or []

    candles = []
    for i, stamp in enumerate(stamps):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue  # Yahoo leaves gaps for some minutes; skip them
        v = volumes[i] if i < len(volumes) and volumes[i] else 0
        candles.append(
            {"t": stamp, "o": round(o, 2), "h": round(h, 2), "l": round(l, 2), "c": round(c, 2), "v": v}
        )

    return {
        "symbol": symbol,
        "range": range_key,
        "interval": interval,
        "prevClose": meta.get("chartPreviousClose") or meta.get("previousClose"),
        "candles": candles,
    }


def fetch_chart(symbol, range_key):
    now = time.time()
    hit = _chart_cache.get((symbol, range_key))
    if hit and now - hit[0] < CACHE_SECONDS + 10:
        return hit[1]

    yahoo_range, interval = RANGES[range_key]
    ticker = quote(yahoo_ticker(symbol), safe="")
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{ticker}?interval={interval}&range={yahoo_range}"
    )
    chart = parse_chart(symbol, range_key, interval, get_json(url))
    _chart_cache[(symbol, range_key)] = (now, chart)
    prune(_chart_cache)
    return chart


def search_stocks(text):
    """Find NSE stocks matching what the person typed (name or ticker)."""
    url = "https://query1.finance.yahoo.com/v1/finance/search?" + urlencode(
        {"q": text, "quotesCount": 10, "newsCount": 0}
    )
    data = get_json(url)
    results = []
    for item in data.get("quotes", []):
        symbol = item.get("symbol", "")
        if item.get("quoteType") == "EQUITY" and symbol.endswith(".NS"):
            short = symbol[:-3]
            if SYMBOL_OK.match(short):
                name = item.get("shortname") or item.get("longname") or short
                results.append({"symbol": short, "name": name})
    return results


# ---------------------------------------------------------------- app icons
# A tiny drawing program, so the app icon (the smiley face) needs no image files.


def make_icon(size, full_bleed):
    ink, face, blue = (27, 35, 64), (255, 226, 122), (61, 77, 255)
    scale = 46 / 0.31  # the face fills 62% of the icon's width
    mouth = []  # points along the smile
    for i in range(25):
        t = i / 24
        x = (1 - t) ** 2 * 32 + 2 * (1 - t) * t * 50 + t ** 2 * 68
        y = (1 - t) ** 2 * 66 + 2 * (1 - t) * t * 80 + t ** 2 * 66
        mouth.append((x, y))
    corner = 0.22  # how round the corners are when the icon isn't full-bleed

    def shade(u, v):
        if not full_bleed:
            dx = max(abs(u - 0.5) - (0.5 - corner), 0)
            dy = max(abs(v - 0.5) - (0.5 - corner), 0)
            if dx * dx + dy * dy > corner * corner:
                return None  # outside the rounded square: transparent
        fx = 50 + (u - 0.5) * scale
        fy = 50 + (v - 0.5) * scale
        dist = math.hypot(fx - 50, fy - 50)
        if dist > 46:
            return blue
        if dist > 41:
            return ink  # outline
        if ((fx - 35) / 4.5) ** 2 + ((fy - 42) / 6.5) ** 2 <= 1:
            return ink  # left eye
        if ((fx - 65) / 4.5) ** 2 + ((fy - 42) / 6.5) ** 2 <= 1:
            return ink  # right eye
        if 58 < fy < 86 and 24 < fx < 76:
            for mx, my in mouth:
                if (fx - mx) ** 2 + (fy - my) ** 2 <= 10:
                    return ink  # smile
        return face

    raw = bytearray()
    offsets = ((0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75))  # smooths the edges
    for y in range(size):
        raw.append(0)  # PNG row filter: none
        for x in range(size):
            r = g = b = hits = 0
            for ox, oy in offsets:
                colour = shade((x + ox) / size, (y + oy) / size)
                if colour:
                    r += colour[0]
                    g += colour[1]
                    b += colour[2]
                    hits += 1
            if hits:
                raw += bytes((r // hits, g // hits, b // hits, 255 * hits // 4))
            else:
                raw += b"\x00\x00\x00\x00"

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


# ---------------------------------------------------------------- the web server


class Handler(BaseHTTPRequestHandler):
    server_version = "Pocketfolio"
    sys_version = ""

    # -- helpers
    def visitor(self):
        # Behind a host's proxy, the last address in this header is the real visitor.
        forwarded = self.headers.get("X-Forwarded-For", "")
        return forwarded.split(",")[-1].strip() or self.client_address[0]

    def respond(self, status, content_type, body, head_only=False, cache="no-cache", gzipped=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if gzipped is not None and "gzip" in self.headers.get("Accept-Encoding", ""):
            body = gzipped
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Vary", "Accept-Encoding")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def send_json(self, payload, status=200, head_only=False):
        body = json.dumps(payload).encode("utf-8")
        self.respond(status, "application/json", body, head_only, cache="no-store")

    def send_static(self, name, content_type, head_only):
        path = os.path.join(FOLDER, name)
        try:
            modified = os.path.getmtime(path)
            cached = _file_cache.get(name)
            if not cached or cached[0] != modified:
                with open(path, "rb") as handle:
                    raw = handle.read()
                cached = (modified, raw, gzip.compress(raw, 6))
                _file_cache[name] = cached
        except OSError:
            self.respond(404, "text/plain; charset=utf-8", b"Not found", head_only)
            return
        self.respond(200, content_type, cached[1], head_only, gzipped=cached[2])

    # -- routes
    def route(self, head_only=False):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/healthz":
            self.respond(200, "text/plain; charset=utf-8", b"ok", head_only, cache="no-store")

        elif path in STATIC_FILES:
            name, content_type = STATIC_FILES[path]
            self.send_static(name, content_type, head_only)

        elif path in ICONS:
            if path not in _icon_cache:
                _icon_cache[path] = make_icon(*ICONS[path])
            self.respond(200, "image/png", _icon_cache[path], head_only, cache="public, max-age=86400")

        elif path == "/favicon.ico":
            self.respond(204, "image/x-icon", b"", head_only, cache="public, max-age=86400")

        elif path.startswith("/api/"):
            if visitor_is_too_busy(self.visitor()):
                self.send_json({"error": "Too many requests. Please slow down."}, 429, head_only)
            elif head_only:
                self.send_json({}, 200, head_only)
            else:
                self.api(path, params)

        else:
            self.respond(404, "text/plain; charset=utf-8", b"Not found", head_only)

    def api(self, path, params):
        if path == "/api/quotes":
            raw = params.get("symbols", [""])[0]
            wanted = [s.strip().upper() for s in raw.split(",")]
            symbols = [s for s in dict.fromkeys(wanted) if s in INDICES or SYMBOL_OK.match(s)]
            quotes, errors = get_quotes(symbols[:MAX_SYMBOLS])
            if errors:
                print("Could not fetch some prices:", errors)
            self.send_json({"quotes": quotes, "errors": errors})

        elif path == "/api/chart":
            symbol = params.get("symbol", [""])[0].strip().upper()
            range_key = params.get("range", ["6M"])[0].upper()
            if range_key not in RANGES or not (symbol in INDICES or SYMBOL_OK.match(symbol)):
                self.send_json({"candles": [], "error": "bad request"})
                return
            try:
                self.send_json(fetch_chart(symbol, range_key))
            except Exception as error:
                print("Chart failed:", error)
                self.send_json({"candles": [], "error": str(error)})

        elif path == "/api/search":
            text = params.get("q", [""])[0].strip()[:40]
            results = []
            if len(text) >= 2:
                try:
                    results = search_stocks(text)
                except Exception as error:
                    print("Search failed:", error)
            self.send_json({"results": results})

        else:
            self.send_json({"error": "not found"}, 404)

    def do_GET(self):
        self.route()

    def do_HEAD(self):
        self.route(head_only=True)

    def log_message(self, format, *args):
        # Keep the terminal quiet: only print lines about prices and searches.
        if "/api/" in self.path:
            super().log_message(format, *args)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    if ON_CLOUD:
        print(f"Pocketfolio is live on port {PORT}")
    else:
        address = f"http://localhost:{PORT}"
        print(f"Pocketfolio is running at {address}")
        print("Leave this window open. Press Ctrl+C to stop.")
        threading.Timer(1, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()