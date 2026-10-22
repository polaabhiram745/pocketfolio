// React is loaded by index.html, so we just pick out the tools we need.
const { useEffect, useMemo, useRef, useState } = React;

/* ==========================================================
   1. DATA
   ========================================================== */

// Popular NSE stocks for instant search: [ticker, company name, sector].
// You can search for ANY NSE stock, not just these. Add your own lines freely.
const STOCK_LIST = [
  ["RELIANCE", "Reliance Industries", "Energy"],
  ["TCS", "Tata Consultancy Services", "IT"],
  ["HDFCBANK", "HDFC Bank", "Banks"],
  ["ICICIBANK", "ICICI Bank", "Banks"],
  ["INFY", "Infosys", "IT"],
  ["BHARTIARTL", "Bharti Airtel", "Telecom"],
  ["ITC", "ITC", "FMCG"],
  ["SBIN", "State Bank of India", "Banks"],
  ["LT", "Larsen & Toubro", "Infra"],
  ["HINDUNILVR", "Hindustan Unilever", "FMCG"],
  ["KOTAKBANK", "Kotak Mahindra Bank", "Banks"],
  ["AXISBANK", "Axis Bank", "Banks"],
  ["INDUSINDBK", "IndusInd Bank", "Banks"],
  ["PNB", "Punjab National Bank", "Banks"],
  ["BANKBARODA", "Bank of Baroda", "Banks"],
  ["BAJFINANCE", "Bajaj Finance", "Finance"],
  ["BAJAJFINSV", "Bajaj Finserv", "Finance"],
  ["SHRIRAMFIN", "Shriram Finance", "Finance"],
  ["SBILIFE", "SBI Life Insurance", "Finance"],
  ["HDFCLIFE", "HDFC Life Insurance", "Finance"],
  ["ASIANPAINT", "Asian Paints", "Consumer"],
  ["TITAN", "Titan Company", "Consumer"],
  ["TRENT", "Trent", "Consumer"],
  ["DMART", "Avenue Supermarts (DMart)", "Consumer"],
  ["ETERNAL", "Eternal (Zomato)", "Consumer"],
  ["IRCTC", "IRCTC", "Consumer"],
  ["MARUTI", "Maruti Suzuki", "Auto"],
  ["M&M", "Mahindra & Mahindra", "Auto"],
  ["BAJAJ-AUTO", "Bajaj Auto", "Auto"],
  ["EICHERMOT", "Eicher Motors", "Auto"],
  ["HEROMOTOCO", "Hero MotoCorp", "Auto"],
  ["SUNPHARMA", "Sun Pharma", "Healthcare"],
  ["DRREDDY", "Dr. Reddy's Laboratories", "Healthcare"],
  ["CIPLA", "Cipla", "Healthcare"],
  ["DIVISLAB", "Divi's Laboratories", "Healthcare"],
  ["APOLLOHOSP", "Apollo Hospitals", "Healthcare"],
  ["NESTLEIND", "Nestle India", "FMCG"],
  ["BRITANNIA", "Britannia Industries", "FMCG"],
  ["TATACONSUM", "Tata Consumer Products", "FMCG"],
  ["WIPRO", "Wipro", "IT"],
  ["HCLTECH", "HCL Technologies", "IT"],
  ["TECHM", "Tech Mahindra", "IT"],
  ["ONGC", "ONGC", "Energy"],
  ["BPCL", "Bharat Petroleum", "Energy"],
  ["IOC", "Indian Oil Corporation", "Energy"],
  ["COALINDIA", "Coal India", "Energy"],
  ["NTPC", "NTPC", "Power"],
  ["POWERGRID", "Power Grid Corporation", "Power"],
  ["TATAPOWER", "Tata Power", "Power"],
  ["TATASTEEL", "Tata Steel", "Metals"],
  ["JSWSTEEL", "JSW Steel", "Metals"],
  ["HINDALCO", "Hindalco Industries", "Metals"],
  ["VEDL", "Vedanta", "Metals"],
  ["ULTRACEMCO", "UltraTech Cement", "Materials"],
  ["GRASIM", "Grasim Industries", "Materials"],
  ["PIDILITIND", "Pidilite Industries", "Materials"],
  ["ADANIENT", "Adani Enterprises", "Infra"],
  ["ADANIPORTS", "Adani Ports", "Infra"],
  ["HAL", "Hindustan Aeronautics", "Infra"],
  ["BEL", "Bharat Electronics", "Infra"],
];

const STOCKS = STOCK_LIST.map(([symbol, name, sector]) => ({ symbol, name, sector }));
const STOCK_BY_SYMBOL = Object.fromEntries(STOCKS.map((s) => [s.symbol, s]));

// Rough placeholder prices (in ₹), used ONLY when server.py isn't running.
const SIM_BASE = {
  RELIANCE: 1400,
  TCS: 3100,
  HDFCBANK: 1000,
  INFY: 1500,
  ITC: 410,
  SBIN: 850,
  ICICIBANK: 1250,
  BHARTIARTL: 1900,
  KOTAKBANK: 2000,
  TITAN: 3400,
};

// Starter portfolios for first-time visitors. `cost` is the price paid per share.
const SAMPLE_SETS = [
  {
    name: "Long term",
    holdings: [
      { symbol: "RELIANCE", qty: 10, cost: 1250 },
      { symbol: "TCS", qty: 5, cost: 3500 },
      { symbol: "HDFCBANK", qty: 25, cost: 900 },
      { symbol: "INFY", qty: 15, cost: 1400 },
      { symbol: "ITC", qty: 40, cost: 380 },
    ],
  },
  {
    name: "Trading",
    holdings: [
      { symbol: "SBIN", qty: 60, cost: 720 },
      { symbol: "ICICIBANK", qty: 20, cost: 1050 },
      { symbol: "BHARTIARTL", qty: 12, cost: 1500 },
    ],
  },
];
const SAMPLE_WATCHLIST = [{ symbol: "KOTAKBANK" }, { symbol: "TITAN" }];

const PORTFOLIOS_KEY = "pocketfolio.portfolios.v1";
const ACTIVE_KEY = "pocketfolio.active.v1";
const HOLD_KEY = "pocketfolio.holdings.v3"; // old key, only read once to move your data over
const WATCH_KEY = "pocketfolio.watchlist.v1";

// Each portfolio gets its own colour (used for the dots and the comparison).
const PORTFOLIO_COLORS = ["#3D4DFF", "#D63D78", "#008C8C", "#C96F00", "#7A5CFF", "#5C6B00"];
const MAX_PORTFOLIOS = 6;

// Makes a unique id number.
let uidCounter = 0;
const uid = () => Date.now() * 1000 + (uidCounter++ % 1000);
const makeHoldings = (list) => list.map((h) => ({ ...h, id: uid() }));

const PALETTE = [
  "#3D4DFF", "#0F6FA8", "#7A5CFF", "#1B2340", "#B5338A",
  "#5C6B00", "#C96F00", "#D63D78", "#008C8C", "#6B4F2A",
];

/* ==========================================================
   2. SMALL HELPER FUNCTIONS
   ========================================================== */

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// Shows numbers like ₹12,34,567.89 (Indian lakh/crore grouping)
const money = (n) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
const signedMoney = (n) => `${n >= 0 ? "+" : "-"}${money(Math.abs(n))}`;
const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

// Same stock always gets the same colour.
function colorFor(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// "RELIANCE INDUSTRIES LTD" -> "Reliance Industries Ltd"
const tidy = (name) =>
  name && name === name.toUpperCase()
    ? name.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())
    : name;

const sectorOf = (symbol) => STOCK_BY_SYMBOL[symbol]?.sector ?? "Other";
const nameOf = (symbol, saved, fromMarket) =>
  saved || STOCK_BY_SYMBOL[symbol]?.name || tidy(fromMarket) || symbol;

// A plain number with Indian grouping, for index levels like 24,350.15
const num = (n) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// The index tiles at the top. These ids are understood by server.py.
const INDEX_LIST = [
  { id: "NIFTY50", name: "Nifty 50" },
  { id: "SENSEX", name: "Sensex" },
  { id: "BANKNIFTY", name: "Bank Nifty" },
  { id: "NIFTYIT", name: "Nifty IT" },
];

// Chart time ranges
const RANGES = ["1D", "5D", "1M", "6M", "1Y", "5Y"];
const RANGE_NAME = {
  "1D": "today",
  "5D": "5 days",
  "1M": "1 month",
  "6M": "6 months",
  "1Y": "1 year",
  "5Y": "5 years",
};

// What the "Compare portfolios" section can rank by.
const METRICS = {
  day: { label: "Today", get: (s) => s.dayPct, fmt: pct },
  ret: { label: "Total return", get: (s) => s.plPct, fmt: pct },
  value: { label: "Value", get: (s) => s.value, fmt: money },
};

// Turns the server's candles into what the chart library wants.
// Times are shifted by 5.5 hours so the chart shows Indian time.
function toBars(data) {
  const intraday = ["5m", "15m", "30m"].includes(data.interval);
  const IST = 19800;
  const seen = new Set();
  const bars = [];
  data.candles.forEach((c) => {
    const time = intraday ? c.t + IST : new Date((c.t + IST) * 1000).toISOString().slice(0, 10);
    if (seen.has(time)) return;
    seen.add(time);
    bars.push({ time, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v });
  });
  return bars;
}

// Simple moving average of the closing prices
function sma(bars, n) {
  const out = [];
  let sum = 0;
  bars.forEach((b, i) => {
    sum += b.close;
    if (i >= n) sum -= bars[i - n].close;
    if (i >= n - 1) out.push({ time: b.time, value: sum / n });
  });
  return out;
}

// Is the NSE open right now? (Mon-Fri, 9:15 am to 3:30 pm India time.
// Market holidays are not tracked.)
function isNseOpen() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = get("weekday");
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  return day !== "Sat" && day !== "Sun" && mins >= 555 && mins < 930;
}

// Builds a wobbly line from "yesterday's close" to "now" for the little charts.
function makeHistory(open, price, n = 30) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const base = open + (price - open) * (i / (n - 1));
    pts.push(i === n - 1 ? price : base * (1 + rand(-0.006, 0.006)));
  }
  return pts;
}

function initMarket() {
  const market = {};
  Object.keys(SIM_BASE).forEach((symbol) => {
    const price = SIM_BASE[symbol];
    const open = price * (1 + rand(-0.025, 0.025));
    market[symbol] = { price, open, history: makeHistory(open, price), live: false };
  });
  return market;
}

// Reads a saved list from the browser's storage.
function loadList(key, fallback, isValid) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isValid);
    }
  } catch (e) {
    /* ignore: use the sample data */
  }
  return fallback;
}
const validHolding = (h) => h && typeof h.symbol === "string" && h.qty > 0 && h.cost > 0;
const validWatch = (w) => w && typeof w.symbol === "string";

// The first colour not used by another portfolio yet.
function nextColor(portfolios) {
  const used = portfolios.map((p) => p.color);
  let color = 0;
  while (used.includes(color)) color++;
  return color;
}

function makeSamplePortfolios() {
  return SAMPLE_SETS.map((set, i) => ({
    id: uid(),
    name: set.name,
    color: i,
    holdings: makeHoldings(set.holdings),
  }));
}

// Reads your saved portfolios. If you used an older version, your holdings
// become the first portfolio. Brand new? You get two sample portfolios.
function loadPortfolios() {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, i) => ({
          id: p.id,
          name: String(p.name || "Portfolio"),
          color: Number.isInteger(p.color) ? p.color : i,
          holdings: (p.holdings || []).filter(validHolding),
        }));
      }
    }
    const old = localStorage.getItem(HOLD_KEY);
    if (old) {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed)) {
        return [{ id: uid(), name: "My portfolio", color: 0, holdings: parsed.filter(validHolding) }];
      }
    }
  } catch (e) {
    /* ignore: use the sample portfolios */
  }
  return makeSamplePortfolios();
}

function moodLine(dayPct) {
  if (dayPct > 3) return "Green everywhere. Try not to get cocky.";
  if (dayPct > 0.5) return "Nice. Quiet gains today.";
  if (dayPct > -0.5) return "Calm day. Nothing to do.";
  if (dayPct > -3) return "A little red. Breathe.";
  return "Ouch. You're investing for years, not minutes.";
}

const POKE_LINES = [
  "Ow.",
  "Hey!",
  "That tickles.",
  "I'm a portfolio, not a stress ball.",
  "Okay, now you're just bored.",
  "Go outside. The charts will still be here.",
];

/* ==========================================================
   3. A CUSTOM HOOK
   Smoothly animates a number from its old value to a new one.
   ========================================================== */

function useCountUp(target, ms = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const begin = fromRef.current;
    const start = performance.now();

    const step = (now) => {
      const t = clamp((now - start) / ms, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3); // starts fast, ends slow
      const v = begin + (target - begin) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, ms]);

  return value;
}

/* ==========================================================
   4. SMALL COMPONENTS
   ========================================================== */

// The face that reacts to how your portfolio is doing today.
function Face({ mood, pokeKey, onPoke }) {
  const m = useCountUp(mood, 600); // -1 (sad) ... +1 (happy)
  const hue = m >= 0 ? 46 + m * 104 : 46 + m * 41; // yellow -> green / red
  const mouthControlY = 66 + m * 16; // below the ends = smile, above = frown

  return (
    <button className="face-btn" onClick={onPoke} aria-label="Poke the face">
      <svg
        key={pokeKey}
        className={`face ${pokeKey > 0 ? "poked" : ""}`}
        viewBox="0 0 100 100"
        role="img"
        aria-label="A face that shows how your portfolio is doing"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill={`hsl(${hue} 90% 62%)`}
          stroke="#1B2340"
          strokeWidth="3"
        />
        <ellipse className="eye" cx="35" cy="42" rx="4" ry="6" fill="#1B2340" />
        <ellipse className="eye" cx="65" cy="42" rx="4" ry="6" fill="#1B2340" />
        <path
          d={`M 32 66 Q 50 ${mouthControlY} 68 66`}
          fill="none"
          stroke="#1B2340"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

// A tiny line chart.
function Sparkline({ data, up }) {
  const w = 90;
  const h = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--gain)" : "var(--loss)"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The donut chart showing how your money is split.
function Donut({ slices, total, hovered, setHovered, unit }) {
  const R = 70;
  const C = 2 * Math.PI * R; // circumference of the circle
  let used = 0;
  const active = slices.find((s) => s.key === hovered);

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" className="donut">
        <circle cx="100" cy="100" r={R} className="donut-track" />
        <g transform="rotate(-90 100 100)">
          {slices.map((s) => {
            const len = (s.value / total) * C;
            const circle = (
              <circle
                key={s.key}
                cx="100"
                cy="100"
                r={R}
                stroke={s.color}
                className={`slice ${hovered === s.key ? "hot" : ""}`}
                style={{
                  strokeDasharray: `${Math.max(len - 2, 0)} ${C}`,
                  strokeDashoffset: -used,
                }}
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
              />
            );
            used += len;
            return circle;
          })}
        </g>
      </svg>

      <div className="donut-center">
        {active ? (
          <>
            <strong style={{ fontSize: active.label.length > 7 ? "1.1rem" : undefined }}>
              {active.label}
            </strong>
            <span>{((active.value / total) * 100).toFixed(1)}% of total</span>
          </>
        ) : (
          <>
            <strong>{slices.length}</strong>
            <span>
              {unit}
              {slices.length === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// The little "live / simulated / no price" tag next to a stock name.
function Tag({ kind }) {
  if (kind === "live") return <em className="livetag">live</em>;
  if (kind === "sim") return <em className="livetag sim">simulated</em>;
  return (
    <em className="livetag none" title="Couldn't fetch a price. Check the ticker, or make sure server.py is running.">
      no price
    </em>
  );
}

// Little candlestick icon for the "open chart" button.
function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M4 2v12M12 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="2.5" y="5" width="3" height="5" rx="0.5" fill="currentColor" />
      <rect x="10.5" y="4" width="3" height="6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

// Wraps a number and flashes green or red for a moment when it goes up or down.
function Flash({ value, children }) {
  const prev = useRef(value);
  const [dir, setDir] = useState("");
  useEffect(() => {
    if (value === prev.current) return undefined;
    setDir(value > prev.current ? "flash-up" : "flash-down");
    prev.current = value;
    const id = setTimeout(() => setDir(""), 900);
    return () => clearTimeout(id);
  }, [value]);
  return <i className={`flash ${dir}`}>{children}</i>;
}

// Small line icons for the buttons.
const ICONS = {
  download: "M8 2.5v7.5M4.8 7.2 8 10.4l3.2-3.2M3 13h10",
  reset: "M2.8 8a5.2 5.2 0 1 0 1.6-3.7M2.6 2.6v2.8h2.8",
  plus: "M8 3v10M3 8h10",
  pencil: "M10.8 2.8l2.4 2.4L6 12.4l-3 .6.6-3z",
  trash: "M3 4.5h10M6.2 4.5V3h3.6v1.5M4.3 4.5l.6 8.5h6.2l.6-8.5M7 7v4M9 7v4",
  upload: "M8 10V2.5M4.8 5.3 8 2.1l3.2 3.2M3 13h10",
};
function Icon({ d }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// The trading chart window. `target` is { symbol, name, buy?, isIndex? }.
function ChartModal({ target, onClose }) {
  const [range, setRange] = useState("6M");
  const [type, setType] = useState("candles"); // candles | line
  const [showMa, setShowMa] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error | nolib
  const [hoverBar, setHoverBar] = useState(null);
  const boxRef = useRef(null);
  const closeRef = useRef(null);
  const fmt = target.isIndex ? num : money;

  // Close with the Escape key, and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, []);

  // Download candles from server.py whenever the time range changes.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setHoverBar(null);
    fetch(`/api/chart?symbol=${encodeURIComponent(target.symbol)}&range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("server error");
        return res.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (!d.candles || d.candles.length === 0) throw new Error("no data");
        setData(d);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [target.symbol, range]);

  const bars = useMemo(() => (data ? toBars(data) : []), [data]);

  // Draw the chart.
  useEffect(() => {
    if (status !== "ready" || bars.length === 0 || !boxRef.current) return undefined;
    const LW = window.LightweightCharts;
    if (!LW) {
      setStatus("nolib");
      return undefined;
    }

    const el = boxRef.current;
    const intraday = ["5m", "15m", "30m"].includes(data.interval);
    const GREEN = "#0B8F68";
    const RED = "#D93A40";

    const chart = LW.createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: LW.ColorType.Solid, color: "#ffffff" },
        textColor: "#1B2340",
        fontFamily: "Instrument Sans, system-ui, sans-serif",
      },
      grid: { vertLines: { color: "#EEF1F8" }, horzLines: { color: "#EEF1F8" } },
      rightPriceScale: { borderColor: "#D9DEEE" },
      timeScale: { borderColor: "#D9DEEE", timeVisible: intraday, secondsVisible: false },
      crosshair: { mode: LW.CrosshairMode.Normal },
      localization: { priceFormatter: (p) => num(p) },
    });

    // The main price series: candles or a simple line
    let main;
    if (type === "candles") {
      main = chart.addCandlestickSeries({
        upColor: GREEN,
        downColor: RED,
        borderUpColor: GREEN,
        borderDownColor: RED,
        wickUpColor: GREEN,
        wickDownColor: RED,
      });
      main.setData(bars.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close })));
    } else {
      main = chart.addLineSeries({ color: "#3D4DFF", lineWidth: 2 });
      main.setData(bars.map((b) => ({ time: b.time, value: b.close })));
    }

    // Volume bars along the bottom (skipped for indexes that have none)
    const hasVolume = bars.some((b) => b.volume > 0);
    let vol = null;
    if (hasVolume) {
      vol = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vol.setData(
        bars.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? "rgba(11,143,104,0.35)" : "rgba(217,58,64,0.35)",
        }))
      );
    }

    // 20-bar moving average
    if (showMa) {
      const ma = chart.addLineSeries({
        color: "#C96F00",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ma.setData(sma(bars, 20));
    }

    // A dashed line at the price you paid
    if (target.buy) {
      main.createPriceLine({
        price: target.buy,
        color: "#3D4DFF",
        lineWidth: 2,
        lineStyle: LW.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "You paid",
      });
    }
    // A dotted line at yesterday's close on the 1D chart
    if (range === "1D" && data.prevClose) {
      main.createPriceLine({
        price: data.prevClose,
        color: "#667091",
        lineWidth: 1,
        lineStyle: LW.LineStyle.Dotted,
        axisLabelVisible: true,
        title: "Prev close",
      });
    }

    // Update the O / H / L / C line as the mouse moves over the chart
    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData && param.seriesData.get(main);
      if (!param.point || !d) {
        setHoverBar(null);
        return;
      }
      const v = vol ? param.seriesData.get(vol) : null;
      setHoverBar({
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close !== undefined ? d.close : d.value,
        volume: v ? v.value : 0,
      });
    });

    chart.timeScale().fitContent();

    // Keep the chart the right size if the window changes
    const watcher = new ResizeObserver(() =>
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight })
    );
    watcher.observe(el);

    return () => {
      watcher.disconnect();
      chart.remove();
    };
  }, [status, bars, data, type, showMa, range]);

  // Numbers for the header and the O/H/L/C line
  const lastBar = bars[bars.length - 1];
  const shown =
    hoverBar ||
    (lastBar && {
      open: lastBar.open,
      high: lastBar.high,
      low: lastBar.low,
      close: lastBar.close,
      volume: lastBar.volume,
    });
  const base = range === "1D" && data && data.prevClose ? data.prevClose : bars[0] && bars[0].open;
  const change = lastBar && base ? lastBar.close - base : 0;
  const changePct = base ? (change / base) * 100 : 0;

  const message = {
    loading: "Loading chart…",
    error: "Couldn't load chart data. The chart needs server.py running and Yahoo Finance reachable.",
    nolib: "The chart library didn't load. Your network may be blocking unpkg.com.",
  }[status];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${target.name} chart`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{target.name}</h2>
            <p className="modal-sub">
              {target.isIndex ? "Index" : `NSE: ${target.symbol}`}
              {status === "ready" && lastBar && (
                <>
                  {" "}
                  <b className="modal-price">{fmt(lastBar.close)}</b>{" "}
                  <span className={change >= 0 ? "up" : "down"}>
                    {change >= 0 ? "+" : "-"}
                    {num(Math.abs(change))} ({pct(changePct)}) over {RANGE_NAME[range]}
                  </span>
                </>
              )}
            </p>
          </div>
          <button ref={closeRef} className="x close" onClick={onClose} aria-label="Close chart">
            ×
          </button>
        </div>

        <div className="chart-controls">
          <div className="chips" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r} className="chip" aria-pressed={range === r} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Chart style">
            <button className="chip" aria-pressed={type === "candles"} onClick={() => setType("candles")}>
              Candles
            </button>
            <button className="chip" aria-pressed={type === "line"} onClick={() => setType("line")}>
              Line
            </button>
            <button className="chip" aria-pressed={showMa} onClick={() => setShowMa(!showMa)}>
              20-bar average
            </button>
          </div>
        </div>

        <p className="legend">
          {status === "ready" && shown ? (
            <>
              {shown.open !== undefined && (
                <>
                  Open <b>{num(shown.open)}</b> High <b>{num(shown.high)}</b> Low <b>{num(shown.low)}</b>{" "}
                </>
              )}
              Close <b>{num(shown.close)}</b>
              {shown.volume > 0 && (
                <>
                  {" "}
                  Volume <b>{new Intl.NumberFormat("en-IN", { notation: "compact" }).format(shown.volume)}</b>
                </>
              )}
            </>
          ) : (
            "\u00a0"
          )}
        </p>

        <div className="chart-wrap">
          <div ref={boxRef} className="chart-box" />
          {status !== "ready" && <div className="chart-msg">{message}</div>}
        </div>

        <p className="fine">
          Scroll to zoom, drag to move along the chart. Each candle covers {data ? data.interval : "…"}. Times are
          in Indian time.{target.buy ? " The dashed blue line is the price you paid." : ""}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================
   5. THE APP
   ========================================================== */

function App() {
  const [market, setMarket] = useState(initMarket);
  const [portfolios, setPortfolios] = useState(loadPortfolios);
  const [activeId, setActiveId] = useState(() => {
    try {
      return Number(localStorage.getItem(ACTIVE_KEY));
    } catch (e) {
      return 0;
    }
  });
  const [watchlist, setWatchlist] = useState(() => loadList(WATCH_KEY, SAMPLE_WATCHLIST, validWatch));
  const [shock, setShock] = useState(0); // the "what if" slider, in %
  const [hovered, setHovered] = useState(null);
  const [sortBy, setSortBy] = useState("value");
  const [groupBy, setGroupBy] = useState("stock"); // stock | sector
  const [leaving, setLeaving] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const [feed, setFeed] = useState("loading"); // loading | live | offline | idle
  const [nseOpen, setNseOpen] = useState(isNseOpen);
  const [indices, setIndices] = useState({}); // Nifty, Sensex... prices from the server
  const [indexFeed, setIndexFeed] = useState("loading"); // loading | live | offline
  const [chartFor, setChartFor] = useState(null); // which chart window is open
  const [naming, setNaming] = useState(null); // { mode: "new" | "rename", value } while typing a portfolio name
  const [compareBy, setCompareBy] = useState("day"); // day | ret | value
  const [updatedAt, setUpdatedAt] = useState(null); // when prices last refreshed
  const [installEvent, setInstallEvent] = useState(null); // lets us show an "Install app" button

  // The "add a stock" note
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState([]); // search results from the server
  const [picked, setPicked] = useState(null); // { symbol, name }
  const [form, setForm] = useState({ qty: "", cost: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const [toast, setToast] = useState(null); // { text, undo }
  const [pokeKey, setPokeKey] = useState(0);
  const [pokeMsg, setPokeMsg] = useState(null);

  const pokeCount = useRef(0);
  const pokeTimer = useRef(0);
  const toastTimer = useRef(0);
  const formRef = useRef(null);
  const qtyRef = useRef(null);
  const restoreRef = useRef(null);

  // The portfolio you're looking at. Everything below (hero, chart, list) uses its holdings.
  const active = portfolios.find((p) => p.id === activeId) || portfolios[0];
  const holdings = active.holdings;
  function setHoldings(update) {
    const id = active.id;
    setPortfolios((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, holdings: typeof update === "function" ? update(p.holdings) : update }
          : p
      )
    );
  }

  // Every stock we need a price for: all portfolios plus the watchlist.
  const trackedKey = useMemo(() => {
    const symbols = new Set(watchlist.map((w) => w.symbol));
    portfolios.forEach((p) => p.holdings.forEach((h) => symbols.add(h.symbol)));
    return [...symbols].join(",");
  }, [portfolios, watchlist]);

  /* ---------- Saving, clocks and price updates ---------- */

  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(portfolios));
    } catch (e) {
      /* storage might be blocked, that's okay */
    }
  }, [portfolios]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, String(active.id));
    } catch (e) {
      /* ignore */
    }
  }, [active.id]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist));
    } catch (e) {
      /* ignore */
    }
  }, [watchlist]);

  // Browsers that can install Pocketfolio as an app tell us here.
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Check every 30 seconds whether the NSE is open.
  useEffect(() => {
    const id = setInterval(() => setNseOpen(isNseOpen()), 30000);
    return () => clearInterval(id);
  }, []);

  // Every 2.5 seconds, nudge SIMULATED prices a tiny bit (real prices stay put).
  useEffect(() => {
    const id = setInterval(() => {
      setMarket((prev) => {
        const next = { ...prev };
        Object.keys(prev).forEach((symbol) => {
          const cur = prev[symbol];
          if (cur.live) return;
          const price = cur.price * (1 + rand(-0.0025, 0.0025));
          next[symbol] = { ...cur, price, history: [...cur.history.slice(1), price] };
        });
        return next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Put prices that came from server.py into the app's memory.
  function mergeQuotes(quotes) {
    setMarket((prev) => {
      const next = { ...prev };
      Object.keys(quotes).forEach((symbol) => {
        const q = quotes[symbol];
        if (!q || !q.price) return;
        const open = q.prevClose || q.price; // yesterday's close
        const hasHistory = q.history && q.history.length > 1;
        next[symbol] = {
          price: q.price,
          open,
          live: true,
          name: q.name,
          history: hasHistory
            ? [...q.history.slice(0, -1), q.price]
            : makeHistory(open, q.price),
        };
      });
      return next;
    });
  }

  async function requestQuotes(list) {
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(list)}`);
    if (!res.ok) throw new Error("server error");
    return res.json();
  }

  // Fetch REAL prices for everything we track, now and every 30 seconds.
  // (Runs again whenever you add or remove a stock.)
  useEffect(() => {
    if (!trackedKey) {
      setFeed("idle");
      return undefined;
    }
    let cancelled = false;

    async function load() {
      try {
        const { quotes } = await requestQuotes(trackedKey);
        if (cancelled) return;
        if (Object.keys(quotes).length === 0) throw new Error("no quotes came back");
        mergeQuotes(quotes);
        setFeed("live");
        setUpdatedAt(new Date());
      } catch (e) {
        if (!cancelled) setFeed("offline");
      }
    }

    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [trackedKey]);

  // Fetch the market indexes (Nifty 50, Sensex...) now and every 30 seconds.
  useEffect(() => {
    let cancelled = false;

    async function loadIndices() {
      try {
        const { quotes } = await requestQuotes(INDEX_LIST.map((i) => i.id).join(","));
        if (cancelled) return;
        if (Object.keys(quotes).length === 0) throw new Error("no index data");
        setIndices((prev) => ({ ...prev, ...quotes }));
        setIndexFeed("live");
      } catch (e) {
        if (!cancelled) setIndexFeed("offline");
      }
    }

    loadIndices();
    const id = setInterval(loadIndices, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Search the server for stocks matching what you type (waits until you pause typing).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      return undefined;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRemote((data.results || []).map((r) => ({ ...r, name: tidy(r.name) })));
      } catch (e) {
        /* offline: the built-in list still works */
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  /* ---------- Do the maths ---------- */

  const rows = useMemo(
    () =>
      holdings.map((h) => {
        const m = market[h.symbol];
        const price = (m ? m.price : h.cost) * (1 + shock / 100);
        const open = m ? m.open : h.cost;
        const value = h.qty * price;
        const costBasis = h.qty * h.cost;
        return {
          id: h.id,
          symbol: h.symbol,
          name: nameOf(h.symbol, h.name, m?.name),
          sector: sectorOf(h.symbol),
          color: colorFor(h.symbol),
          qty: h.qty,
          buy: h.cost,
          price,
          value,
          pl: value - costBasis,
          plPct: costBasis ? ((value - costBasis) / costBasis) * 100 : 0,
          day: h.qty * (price - open),
          dayPct: open ? ((price - open) / open) * 100 : 0,
          kind: m ? (m.live ? "live" : "sim") : "none",
          history: m ? m.history : [h.cost, h.cost],
        };
      }),
    [holdings, market, shock]
  );

  const watchRows = useMemo(
    () =>
      watchlist.map((w) => {
        const m = market[w.symbol];
        const price = m ? m.price * (1 + shock / 100) : null;
        return {
          symbol: w.symbol,
          name: nameOf(w.symbol, w.name, m?.name),
          color: colorFor(w.symbol),
          price,
          dayPct: m && m.open ? ((price - m.open) / m.open) * 100 : 0,
          kind: m ? (m.live ? "live" : "sim") : "none",
          history: m ? m.history : [1, 1],
        };
      }),
    [watchlist, market, shock]
  );

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.qty * h.cost, 0);
  const totalDay = rows.reduce((s, r) => s + r.day, 0);
  const totalPl = totalValue - totalCost;
  const openValue = totalValue - totalDay;
  const dayPct = openValue ? (totalDay / openValue) * 100 : 0;
  const plPct = totalCost ? (totalPl / totalCost) * 100 : 0;
  const mood = clamp(dayPct / 3, -1, 1);

  const animatedTotal = useCountUp(totalValue, 700);

  const sortedRows = [...rows].sort((a, b) => b[sortBy] - a[sortBy]);

  // One summary line per portfolio, for the comparison section.
  const stats = useMemo(
    () =>
      portfolios.map((p) => {
        let value = 0;
        let cost = 0;
        let day = 0;
        p.holdings.forEach((h) => {
          const m = market[h.symbol];
          const price = (m ? m.price : h.cost) * (1 + shock / 100);
          const open = m ? m.open : h.cost;
          value += h.qty * price;
          cost += h.qty * h.cost;
          day += h.qty * (price - open);
        });
        const openValue = value - day;
        return {
          id: p.id,
          name: p.name,
          color: PORTFOLIO_COLORS[(p.color || 0) % PORTFOLIO_COLORS.length],
          count: p.holdings.length,
          value,
          cost,
          day,
          dayPct: openValue ? (day / openValue) * 100 : 0,
          pl: value - cost,
          plPct: cost ? ((value - cost) / cost) * 100 : 0,
        };
      }),
    [portfolios, market, shock]
  );

  // Best and weakest stock today (only stocks that have a price)
  const priced = rows.filter((r) => r.kind !== "none");
  const best = priced.length > 1 ? priced.reduce((a, b) => (b.dayPct > a.dayPct ? b : a)) : null;
  const worst = priced.length > 1 ? priced.reduce((a, b) => (b.dayPct < a.dayPct ? b : a)) : null;

  // Donut slices: one per stock, or one per sector
  const hoverKey = (r) => (groupBy === "sector" ? r.sector : r.symbol);
  const slices = useMemo(() => {
    const totals = new Map();
    rows.forEach((r) => {
      const key = groupBy === "sector" ? r.sector : r.symbol;
      totals.set(key, (totals.get(key) || 0) + r.value);
    });
    return [...totals.entries()]
      .map(([key, value]) => ({ key, label: key, value, color: colorFor(key) }))
      .sort((a, b) => b.value - a.value);
  }, [rows, groupBy]);

  // What to suggest while typing in the search box
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const low = q.toLowerCase();
    const starts = (s) => Number(s.symbol.toLowerCase().startsWith(low));
    const local = STOCKS.filter(
      (s) => s.symbol.toLowerCase().includes(low) || s.name.toLowerCase().includes(low)
    )
      .sort((a, b) => starts(b) - starts(a))
      .slice(0, 5);
    const seen = new Set(local.map((s) => s.symbol));
    const extra = remote.filter((r) => !seen.has(r.symbol)).slice(0, 5);
    const all = [...local, ...extra];
    if (all.length === 0) {
      const symbol = q.toUpperCase().replace(/[^A-Z0-9&-]/g, "");
      if (symbol) return [{ symbol, name: "Use this ticker (NSE)" }];
    }
    return all;
  }, [query, remote]);

  /* ---------- Things the user can do ---------- */

  function showToast(text, undo = null) {
    clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function poke() {
    setPokeKey((k) => k + 1);
    setPokeMsg(POKE_LINES[pokeCount.current % POKE_LINES.length]);
    pokeCount.current += 1;
    clearTimeout(pokeTimer.current);
    pokeTimer.current = setTimeout(() => setPokeMsg(null), 2200);
  }

  function resetForm() {
    setPicked(null);
    setQuery("");
    setRemote([]);
    setForm({ qty: "", cost: "" });
    setEditingId(null);
    setError("");
  }

  function focusForm() {
    if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => qtyRef.current && qtyRef.current.focus(), 350);
  }

  // Choose a stock from the search suggestions.
  function pickStock(s) {
    setPicked({ symbol: s.symbol, name: s.name });
    setQuery("");
    setRemote([]);
    setError("");
    setTimeout(() => qtyRef.current && qtyRef.current.focus(), 0);
    // Look up its price right away so we can show it.
    requestQuotes(s.symbol)
      .then((data) => mergeQuotes(data.quotes))
      .catch(() => {});
  }

  // Add a new holding, or save changes to an existing one.
  function submitForm(e) {
    e.preventDefault();
    if (!picked) {
      setError("Search for a stock and pick it from the list first.");
      return;
    }
    const qty = parseFloat(form.qty);
    if (!qty || qty <= 0) {
      setError("Enter how many shares you own, like 10.");
      return;
    }
    const paid = parseFloat(form.cost);

    if (editingId) {
      if (!paid || paid <= 0) {
        setError("Enter the average price you paid per share.");
        return;
      }
      setHoldings(holdings.map((h) => (h.id === editingId ? { ...h, qty, cost: paid } : h)));
      showToast(`Saved changes to ${picked.symbol}.`);
      resetForm();
      return;
    }

    const known = market[picked.symbol]?.price;
    const cost = paid > 0 ? paid : known;
    if (!cost) {
      setError("No price found yet for this stock. Enter the price you paid.");
      return;
    }

    const existing = holdings.find((h) => h.symbol === picked.symbol);
    if (existing) {
      // Same stock again? Merge and average the buy price.
      const newQty = existing.qty + qty;
      const avg = (existing.qty * existing.cost + qty * cost) / newQty;
      setHoldings(holdings.map((h) => (h.id === existing.id ? { ...h, qty: newQty, cost: avg } : h)));
      setJustAdded(existing.id);
    } else {
      const id = Date.now();
      setHoldings([...holdings, { id, symbol: picked.symbol, name: picked.name, qty, cost }]);
      setJustAdded(id);
    }
    setWatchlist(watchlist.filter((w) => w.symbol !== picked.symbol)); // no longer "just watching"
    showToast(`Added ${qty} × ${picked.symbol} to your portfolio.`);
    resetForm();
  }

  function addWatch() {
    if (!picked) {
      setError("Search for a stock and pick it from the list first.");
      return;
    }
    if (watchlist.some((w) => w.symbol === picked.symbol)) {
      setError(`${picked.symbol} is already on your watchlist.`);
      return;
    }
    setWatchlist([...watchlist, { symbol: picked.symbol, name: picked.name }]);
    showToast(`Now watching ${picked.symbol}.`);
    resetForm();
  }

  // Load a holding into the note so you can fix the quantity or price.
  function startEdit(r) {
    setEditingId(r.id);
    setPicked({ symbol: r.symbol, name: r.name });
    setForm({ qty: String(r.qty), cost: String(Number(r.buy.toFixed(2))) });
    setError("");
    focusForm();
  }

  // "I bought it": load a watchlist stock into the note.
  function buyFromWatch(w) {
    setEditingId(null);
    setPicked({ symbol: w.symbol, name: w.name });
    setForm({ qty: "", cost: "" });
    setError("");
    focusForm();
  }

  function removeHolding(r) {
    const item = holdings.find((h) => h.id === r.id);
    setLeaving(r.id);
    if (hovered === hoverKey(r)) setHovered(null);
    if (editingId === r.id) resetForm();
    setTimeout(() => {
      setHoldings((prev) => prev.filter((h) => h.id !== r.id));
      setLeaving(null);
      showToast(`Removed ${r.symbol}.`, () => {
        setHoldings((prev) => [...prev, item]);
        setJustAdded(item.id);
      });
    }, 300);
  }

  function removeWatch(symbol) {
    const item = watchlist.find((w) => w.symbol === symbol);
    setWatchlist(watchlist.filter((w) => w.symbol !== symbol));
    showToast(`Stopped watching ${symbol}.`, () => setWatchlist((prev) => [...prev, item]));
  }

  function switchTo(id) {
    setActiveId(id);
    setHovered(null);
    setNaming(null);
    resetForm();
  }

  function startNaming(mode) {
    setNaming({ mode, value: mode === "rename" ? active.name : "" });
  }

  // Create a new portfolio, or rename the current one.
  function saveName(e) {
    e.preventDefault();
    const name = naming.value.trim().slice(0, 24);
    if (!name) {
      showToast("Give the portfolio a name first.");
      return;
    }
    const clash = portfolios.some(
      (p) => p.name.toLowerCase() === name.toLowerCase() && !(naming.mode === "rename" && p.id === active.id)
    );
    if (clash) {
      showToast(`You already have a portfolio called ${name}.`);
      return;
    }
    if (naming.mode === "rename") {
      setPortfolios(portfolios.map((p) => (p.id === active.id ? { ...p, name } : p)));
      showToast(`Renamed to ${name}.`);
    } else {
      const id = uid();
      setPortfolios([...portfolios, { id, name, color: nextColor(portfolios), holdings: [] }]);
      setActiveId(id);
      resetForm();
      showToast(`Created ${name}. Add your first stock.`);
    }
    setNaming(null);
  }

  function deletePortfolio() {
    if (portfolios.length < 2) return;
    const index = portfolios.findIndex((p) => p.id === active.id);
    const removed = portfolios[index];
    const rest = portfolios.filter((p) => p.id !== removed.id);
    setPortfolios(rest);
    setActiveId(rest[Math.max(0, index - 1)].id);
    resetForm();
    showToast(`Deleted ${removed.name}.`, () => {
      setPortfolios((prev) => {
        const copy = [...prev];
        copy.splice(Math.min(index, copy.length), 0, removed);
        return copy;
      });
      setActiveId(removed.id);
    });
  }

  // Remove every stock from this portfolio so all its numbers go back to zero.
  function resetPortfolio() {
    if (holdings.length === 0) return;
    const saved = holdings;
    const id = active.id;
    setHoldings([]);
    resetForm();
    showToast(`Cleared every stock from ${active.name}.`, () =>
      setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, holdings: saved } : p)))
    );
  }

  function loadSampleStocks() {
    setHoldings(makeHoldings(SAMPLE_SETS[0].holdings));
    showToast(`Added sample stocks to ${active.name}.`);
  }

  function addSamplePortfolio() {
    if (portfolios.length >= MAX_PORTFOLIOS) {
      showToast(`You can have up to ${MAX_PORTFOLIOS} portfolios.`);
      return;
    }
    const set = SAMPLE_SETS[1];
    let name = set.name;
    let n = 2;
    while (portfolios.some((p) => p.name.toLowerCase() === name.toLowerCase())) name = `${set.name} ${n++}`;
    const id = uid();
    setPortfolios([...portfolios, { id, name, color: nextColor(portfolios), holdings: makeHoldings(set.holdings) }]);
    showToast(`Added a sample portfolio called ${name}.`);
  }

  async function installApp() {
    if (!installEvent) return;
    installEvent.prompt();
    try {
      await installEvent.userChoice;
    } catch (e) {
      /* ignore */
    }
    setInstallEvent(null);
  }

  // Save every portfolio and your watchlist into one file you can keep.
  function backupAll() {
    const data = {
      app: "pocketfolio",
      version: 1,
      exportedAt: new Date().toISOString(),
      portfolios,
      watchlist,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pocketfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup saved. Keep that file somewhere safe.");
  }

  // Load a backup file. Replaces what's on screen, and you can undo it.
  function restoreFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.app !== "pocketfolio" || !Array.isArray(data.portfolios) || data.portfolios.length === 0) {
          throw new Error("not a Pocketfolio backup");
        }
        const goodSymbol = (h) => h && /^[A-Z0-9&-]{1,20}$/.test(String(h.symbol).toUpperCase());
        const list = data.portfolios.slice(0, MAX_PORTFOLIOS).map((p, i) => ({
          id: uid(),
          name: String(p.name || `Portfolio ${i + 1}`).slice(0, 24),
          color: Number.isInteger(p.color) ? p.color : i,
          holdings: (Array.isArray(p.holdings) ? p.holdings : [])
            .filter((h) => goodSymbol(h) && Number(h.qty) > 0 && Number(h.cost) > 0)
            .map((h) => ({
              id: uid(),
              symbol: String(h.symbol).toUpperCase(),
              name: h.name ? String(h.name).slice(0, 80) : undefined,
              qty: Number(h.qty),
              cost: Number(h.cost),
            })),
        }));
        const watch = (Array.isArray(data.watchlist) ? data.watchlist : [])
          .filter(goodSymbol)
          .map((w) => ({ symbol: String(w.symbol).toUpperCase(), name: w.name ? String(w.name).slice(0, 80) : undefined }));

        const before = { portfolios, watchlist, activeId: active.id };
        setPortfolios(list);
        setWatchlist(watch);
        setActiveId(list[0].id);
        setNaming(null);
        resetForm();
        showToast(`Restored ${list.length} portfolio${list.length === 1 ? "" : "s"} from your backup.`, () => {
          setPortfolios(before.portfolios);
          setWatchlist(before.watchlist);
          setActiveId(before.activeId);
        });
      } catch (e) {
        showToast("That file isn't a Pocketfolio backup.");
      }
    };
    reader.readAsText(file);
  }

  // Download your holdings as a spreadsheet file.
  function exportCsv() {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Symbol", "Name", "Quantity", "Buy price", "Current price", "Value", "Profit/Loss", "Profit/Loss %"]
        .map(esc)
        .join(","),
    ];
    rows.forEach((r) => {
      const now = market[r.symbol]?.price ?? r.buy;
      const value = r.qty * now;
      const pl = value - r.qty * r.buy;
      lines.push(
        [r.symbol, r.name, r.qty, r.buy.toFixed(2), now.toFixed(2), value.toFixed(2), pl.toFixed(2), ((pl / (r.qty * r.buy)) * 100).toFixed(2)]
          .map(esc)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "portfolio";
    link.download = `${slug}-portfolio.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const statusText = {
    loading: "Connecting to live prices…",
    live: `Live prices (may be delayed)${
      updatedAt ? `, updated ${updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""
    }`,
    offline: "Can't reach server.py, so prices are simulated. Is it running?",
    idle: "Add a stock to start tracking",
  }[feed];

  // "You vs Nifty": compare today's move of your portfolio with the Nifty 50.
  const nifty = indices.NIFTY50;
  const niftyPct = nifty && nifty.prevClose ? ((nifty.price - nifty.prevClose) / nifty.prevClose) * 100 : null;
  let compareText = "Compared with Nifty 50 once prices load";
  if (shock !== 0) compareText = "What-if mode is on";
  else if (rows.length === 0) compareText = "Add a stock to compare";
  else if (feed !== "live") compareText = "Needs live prices to compare";
  else if (niftyPct === null) compareText = "Nifty 50 data isn't available";
  else {
    const diff = dayPct - niftyPct;
    compareText =
      Math.abs(diff) < 0.05
        ? "In line with Nifty 50 today"
        : `${diff > 0 ? "Beating" : "Trailing"} Nifty 50 by ${Math.abs(diff).toFixed(2)}% today`;
  }

  // ----- Compare portfolios -----
  const filled = stats.filter((x) => x.count > 0);
  const empties = stats.filter((x) => x.count === 0);
  const metric = METRICS[compareBy];
  const compareBars = filled.map((x) => ({ key: x.id, name: x.name, color: x.color, value: metric.get(x) }));
  const showNifty = compareBy === "day" && shock === 0 && feed === "live" && niftyPct !== null;
  if (showNifty) compareBars.push({ key: "nifty", name: "Nifty 50", color: "#667091", value: niftyPct, ref: true });
  compareBars.sort((a, b) => b.value - a.value);
  const maxAbs = Math.max(...compareBars.map((b) => Math.abs(b.value)), 0.0001);

  let compareHeadline = "";
  const ranked = compareBars.filter((b) => !b.ref);
  if (ranked.length >= 2) {
    const lead = ranked[0];
    const trail = ranked[ranked.length - 1];
    if (compareBy === "value") {
      compareHeadline = `${lead.name} is your biggest portfolio at ${money(lead.value)}.`;
    } else {
      compareHeadline = `${lead.name} leads ${compareBy === "day" ? "today" : "overall"} at ${pct(lead.value)}, ${Math.abs(
        lead.value - trail.value
      ).toFixed(2)}% ahead of ${trail.name}.`;
      if (showNifty) {
        const beating = ranked.filter((b) => b.value > niftyPct).length;
        compareHeadline += ` ${beating} of ${ranked.length} beat the Nifty 50.`;
      }
    }
  }
  const all = {
    count: filled.reduce((t, x) => t + x.count, 0),
    cost: filled.reduce((t, x) => t + x.cost, 0),
    value: filled.reduce((t, x) => t + x.value, 0),
    day: filled.reduce((t, x) => t + x.day, 0),
  };
  all.pl = all.value - all.cost;
  all.plPct = all.cost ? (all.pl / all.cost) * 100 : 0;
  all.dayPct = all.value - all.day ? (all.day / (all.value - all.day)) * 100 : 0;

  const knownPrice = picked ? market[picked.symbol]?.price : null;
  let priceHint = "Looking up price…";
  if (knownPrice) priceHint = `Now ${money(knownPrice)}`;
  else if (feed === "offline") priceHint = "No live price (server not reachable)";

  /* ---------- What the screen looks like ---------- */

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">Pocketfolio</span>
        <div className="topright">
          {installEvent && (
            <button className="mini-btn solid" onClick={installApp} title="Install Pocketfolio as an app">
              <Icon d={ICONS.download} /> Install app
            </button>
          )}
          <span className={`mkt ${nseOpen ? "open" : "closed"}`}>
            {nseOpen ? "NSE is open" : "NSE is closed"}
          </span>
          <span className={`status ${feed}`}>
            <i className="dot" />
            {statusText}
          </span>
        </div>
      </header>

      {/* ----- Market indexes ----- */}
      <section className="indices" aria-label="Market indexes">
        <div className="tile you">
          <span className="tile-name">{active.name} today</span>
          <strong className={dayPct >= 0 ? "up" : "down"}>{rows.length ? pct(dayPct) : "–"}</strong>
          <small>{compareText}</small>
        </div>

        {INDEX_LIST.map((ix) => {
          const q = indices[ix.id];
          const change = q && q.prevClose ? q.price - q.prevClose : 0;
          const changePct = q && q.prevClose ? (change / q.prevClose) * 100 : 0;
          return (
            <button
              key={ix.id}
              className="tile"
              onClick={() => setChartFor({ symbol: ix.id, name: ix.name, isIndex: true })}
              title={`Open the ${ix.name} chart`}
            >
              <span className="tile-name">{ix.name}</span>
              <strong className={!q && indexFeed === "loading" ? "skel" : ""}>
                {q ? <Flash value={q.price}>{num(q.price)}</Flash> : "–"}
              </strong>
              <small className={q ? (change >= 0 ? "up" : "down") : indexFeed === "loading" ? "faint skel" : "faint"}>
                {q
                  ? `${change >= 0 ? "+" : "-"}${num(Math.abs(change))} (${pct(changePct)})`
                  : indexFeed === "offline"
                  ? "unavailable"
                  : "loading…"}
              </small>
              {q && q.history && q.history.length > 1 && <Sparkline data={q.history} up={change >= 0} />}
            </button>
          );
        })}
      </section>

      {/* ----- Portfolio tabs ----- */}
      <nav className="tabs" aria-label="Portfolios">
        <div className="tablist" role="tablist">
          {portfolios.map((p) => {
            const on = p.id === active.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={on}
                className={`tab ${on ? "on" : ""}`}
                onClick={() => switchTo(p.id)}
              >
                <i className="tab-dot" style={{ background: PORTFOLIO_COLORS[(p.color || 0) % PORTFOLIO_COLORS.length] }} />
                {p.name}
              </button>
            );
          })}
        </div>

        {naming ? (
          <form className="tab-form" onSubmit={saveName}>
            <input
              autoFocus
              value={naming.value}
              maxLength={24}
              placeholder={naming.mode === "new" ? "Portfolio name" : "New name"}
              aria-label="Portfolio name"
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Escape") setNaming(null);
              }}
            />
            <button type="submit" className="mini-btn solid">
              {naming.mode === "new" ? "Create" : "Save"}
            </button>
            <button type="button" className="mini-btn" onClick={() => setNaming(null)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="tab-tools">
            <button
              className="mini-btn"
              onClick={() => startNaming("new")}
              disabled={portfolios.length >= MAX_PORTFOLIOS}
              title={portfolios.length >= MAX_PORTFOLIOS ? `Up to ${MAX_PORTFOLIOS} portfolios` : "Create a new portfolio"}
            >
              <Icon d={ICONS.plus} /> New
            </button>
            <button className="mini-btn" onClick={() => startNaming("rename")} title="Rename this portfolio">
              <Icon d={ICONS.pencil} /> Rename
            </button>
            <button
              className="mini-btn danger"
              onClick={deletePortfolio}
              disabled={portfolios.length < 2}
              title={portfolios.length < 2 ? "You need at least one portfolio" : "Delete this portfolio (you can undo)"}
            >
              <Icon d={ICONS.trash} /> Delete
            </button>
          </div>
        )}
      </nav>

      {/* ----- Hero ----- */}
      <section className="hero">
        <Face mood={mood} pokeKey={pokeKey} onPoke={poke} />

        <div className="hero-body">
          <p className="bubble" aria-live="polite">
            {pokeMsg ?? moodLine(dayPct)}
          </p>

          <h1 className="networth">{money(animatedTotal)}</h1>

          <div className="deltas">
            <div className={totalDay >= 0 ? "up" : "down"}>
              {signedMoney(totalDay)} ({pct(dayPct)})
              <small>Today</small>
            </div>
            <div className={totalPl >= 0 ? "up" : "down"}>
              {signedMoney(totalPl)} ({pct(plPct)})
              <small>Since you bought</small>
            </div>
            <div>
              {money(totalCost)}
              <small>Invested</small>
            </div>
          </div>

          {best && worst && best.symbol !== worst.symbol && (
            <p className="movers">
              Best today: <b>{best.symbol}</b>{" "}
              <span className={best.dayPct >= 0 ? "up" : "down"}>{pct(best.dayPct)}</span>. Weakest:{" "}
              <b>{worst.symbol}</b>{" "}
              <span className={worst.dayPct >= 0 ? "up" : "down"}>{pct(worst.dayPct)}</span>.
            </p>
          )}

          <div className="whatif">
            <div className="whatif-head">
              <label htmlFor="shock">
                {shock === 0
                  ? "What if the whole market moved?"
                  : `What if the market ${shock > 0 ? "rose" : "fell"} ${Math.abs(shock)}%?`}
              </label>
              {shock !== 0 && (
                <button className="linkbtn" onClick={() => setShock(0)}>
                  Back to now
                </button>
              )}
            </div>
            <input
              id="shock"
              type="range"
              min="-40"
              max="40"
              step="1"
              value={shock}
              onChange={(e) => setShock(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* ----- Main area ----- */}
      <main className="main">
        <aside className="side">
          {rows.length > 0 && totalValue > 0 ? (
            <div>
              <div className="chips center" role="group" aria-label="Group the chart">
                {[
                  ["stock", "By stock"],
                  ["sector", "By sector"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className="chip"
                    aria-pressed={groupBy === key}
                    onClick={() => {
                      setGroupBy(key);
                      setHovered(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Donut
                slices={slices}
                total={totalValue}
                hovered={hovered}
                setHovered={setHovered}
                unit={groupBy === "sector" ? "sector" : "stock"}
              />
            </div>
          ) : (
            <p className="empty">Your split will show up here.</p>
          )}

          <form className="note" onSubmit={submitForm} ref={formRef}>
            <h2>{editingId ? "Edit holding" : "Add a stock"}</h2>

            {!picked && (
              <div className="search">
                <label>
                  Search any NSE stock
                  <input
                    type="search"
                    placeholder="Try reliance, tata, or HDFCBANK"
                    value={query}
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {suggestions.length > 0 && (
                  <ul className="suggest">
                    {suggestions.map((s) => (
                      <li key={s.symbol}>
                        <button type="button" onClick={() => pickStock(s)}>
                          <strong>{s.symbol}</strong>
                          <span>{s.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {picked && (
              <div className="picked">
                <span className="badge small" style={{ background: colorFor(picked.symbol) }}>
                  {picked.symbol.slice(0, 4)}
                </span>
                <div>
                  <strong>{picked.name}</strong>
                  <small>{priceHint}</small>
                </div>
                {!editingId && (
                  <button type="button" className="linkbtn" onClick={() => setPicked(null)}>
                    Change
                  </button>
                )}
              </div>
            )}

            <label>
              {editingId ? "Shares you own" : "How many shares?"}
              <input
                ref={qtyRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 10"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </label>

            <label>
              {editingId ? "Average price paid per share" : "Price you paid per share (optional)"}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder={knownPrice ? money(knownPrice) : "e.g. 1250"}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button className="btn" type="submit">
              {editingId ? "Save changes" : "Add to portfolio"}
            </button>
            {editingId ? (
              <button className="btn ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : (
              <button className="btn ghost" type="button" onClick={addWatch}>
                Just watch it
              </button>
            )}
          </form>
        </aside>

        <section className="holdings">
          <div className="list-head">
            <h2>
              Your holdings
              {holdings.length > 0 && <span className="count">{holdings.length}</span>}
            </h2>
            <div className="chips" role="group" aria-label="Sort holdings">
              {[
                ["value", "Biggest"],
                ["day", "Today"],
                ["pl", "Profit"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className="chip"
                  aria-pressed={sortBy === key}
                  onClick={() => setSortBy(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sortedRows.length === 0 ? (
            <div className="empty-card">
              <p>
                <strong>{active.name} is empty.</strong> Search for a stock with the yellow note, or start with a few
                sample stocks.
              </p>
              <button className="action-btn" onClick={loadSampleStocks}>
                <Icon d={ICONS.plus} /> Load sample stocks
              </button>
            </div>
          ) : (
            <ul className="rows">
              {sortedRows.map((r) => (
                <li
                  key={r.id}
                  className={`row ${hovered === hoverKey(r) ? "hot" : ""} ${
                    leaving === r.id ? "leaving" : ""
                  } ${justAdded === r.id ? "fresh" : ""}`}
                  onMouseEnter={() => setHovered(hoverKey(r))}
                  onMouseLeave={() => setHovered(null)}
                  onAnimationEnd={() => setJustAdded(null)}
                >
                  <span className="badge" style={{ background: r.color }}>
                    {r.symbol.slice(0, 4)}
                  </span>

                  <div className="who">
                    <strong>
                      {r.name}
                      <Tag kind={r.kind} />
                    </strong>
                    <span>
                      {Number(r.qty.toFixed(4))} × <Flash value={r.price}>{money(r.price)}</Flash>{" "}
                      <b className={r.dayPct >= 0 ? "up" : "down"}>{pct(r.dayPct)}</b>
                    </span>
                  </div>

                  <Sparkline data={r.history} up={r.dayPct >= 0} />

                  <div className="money">
                    <strong>
                      <Flash value={r.value}>{money(r.value)}</Flash>
                    </strong>
                    <span className={r.pl >= 0 ? "up" : "down"}>
                      {signedMoney(r.pl)} ({pct(r.plPct)})
                    </span>
                  </div>

                  <div className="row-actions">
                    <button
                      className="x chartbtn"
                      onClick={() => setChartFor({ symbol: r.symbol, name: r.name, buy: r.buy })}
                      aria-label={`Open ${r.name} chart`}
                      title="Open chart"
                    >
                      <ChartIcon />
                    </button>
                    <button
                      className="x edit"
                      onClick={() => startEdit(r)}
                      aria-label={`Edit ${r.name}`}
                      title="Edit shares or price"
                    >
                      ✎
                    </button>
                    <button
                      className="x"
                      onClick={() => removeHolding(r)}
                      aria-label={`Remove ${r.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="watch">
            <h2>
              Watchlist
              {watchRows.length > 0 && <span className="count">{watchRows.length}</span>}
            </h2>
            {watchRows.length === 0 ? (
              <p className="empty small">
                Stocks you only want to keep an eye on will show up here. Use "Just watch it" on the note.
              </p>
            ) : (
              <ul className="rows">
                {watchRows.map((w) => (
                  <li key={w.symbol} className="row watchrow">
                    <span className="badge" style={{ background: w.color }}>
                      {w.symbol.slice(0, 4)}
                    </span>
                    <div className="who">
                      <strong>
                        {w.name}
                        <Tag kind={w.kind} />
                      </strong>
                      <span>
                        {w.price ? money(w.price) : "no price yet"}{" "}
                        {w.price && <b className={w.dayPct >= 0 ? "up" : "down"}>{pct(w.dayPct)}</b>}
                      </span>
                    </div>
                    <Sparkline data={w.history} up={w.dayPct >= 0} />
                    <div className="money">
                      <button className="chip" onClick={() => buyFromWatch(w)}>
                        I bought it
                      </button>
                    </div>
                    <div className="row-actions">
                      <button
                        className="x chartbtn"
                        onClick={() => setChartFor({ symbol: w.symbol, name: w.name })}
                        aria-label={`Open ${w.name} chart`}
                        title="Open chart"
                      >
                        <ChartIcon />
                      </button>
                      <button
                        className="x"
                        onClick={() => removeWatch(w.symbol)}
                        aria-label={`Stop watching ${w.name}`}
                        title="Remove from watchlist"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="actions">
            <button
              className="action-btn"
              onClick={exportCsv}
              disabled={rows.length === 0}
              title="Download this portfolio as a spreadsheet file"
            >
              <Icon d={ICONS.download} /> Download CSV
            </button>
            <button
              className="action-btn danger"
              onClick={resetPortfolio}
              disabled={rows.length === 0}
              title="Remove every stock from this portfolio (you can undo)"
            >
              <Icon d={ICONS.reset} /> Reset portfolio
            </button>
          </div>
        </section>
      </main>

      {/* ----- Compare portfolios ----- */}
      <section className="compare" aria-labelledby="compare-title">
        <div className="compare-head">
          <div>
            <h2 id="compare-title">Compare portfolios</h2>
            {compareHeadline && <p className="compare-sub">{compareHeadline}</p>}
          </div>
          <div className="chips" role="group" aria-label="Compare by">
            {Object.entries(METRICS).map(([key, m]) => (
              <button key={key} className="chip" aria-pressed={compareBy === key} onClick={() => setCompareBy(key)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {portfolios.length < 2 ? (
          <div className="empty-card">
            <p>
              <strong>You have one portfolio.</strong> Make another one, like "Trading" or "Retirement", and they'll be
              compared here side by side, and against the Nifty 50.
            </p>
            <div className="actions">
              <button
                className="action-btn"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  startNaming("new");
                }}
              >
                <Icon d={ICONS.plus} /> Create a portfolio
              </button>
              <button className="action-btn" onClick={addSamplePortfolio}>
                Add a sample portfolio
              </button>
            </div>
          </div>
        ) : filled.length === 0 ? (
          <p className="empty">Add stocks to your portfolios and they'll be compared here.</p>
        ) : (
          <>
            <ul className="bars">
              {compareBars.map((b) => {
                const diverging = compareBy !== "value";
                const w = (Math.abs(b.value) / maxAbs) * (diverging ? 50 : 100);
                const left = diverging ? (b.value >= 0 ? 50 : 50 - w) : 0;
                const fill = b.ref ? "var(--muted)" : diverging ? (b.value >= 0 ? "var(--gain)" : "var(--loss)") : b.color;
                return (
                  <li key={b.key} className={`bar-row ${b.ref ? "ref" : ""}`}>
                    <span className="bar-name">
                      <i className="tab-dot" style={{ background: b.color }} />
                      {b.name}
                    </span>
                    <div className="bar-track">
                      {diverging && <span className="bar-zero" />}
                      <span className="bar-fill" style={{ left: `${left}%`, width: `${w}%`, background: fill }} />
                    </div>
                    <strong className={diverging ? (b.value >= 0 ? "up" : "down") : ""}>{metric.fmt(b.value)}</strong>
                  </li>
                );
              })}
            </ul>

            {empties.length > 0 && (
              <p className="compare-note">
                Not shown because they have no stocks yet: {empties.map((x) => x.name).join(", ")}.
              </p>
            )}
            {shock !== 0 && (
              <p className="compare-note">What-if mode is on, so these numbers include the market move you picked.</p>
            )}

            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Portfolio</th>
                    <th>Stocks</th>
                    <th>Invested</th>
                    <th>Value</th>
                    <th>Profit / loss</th>
                    <th>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {filled.map((x) => (
                    <tr key={x.id} className={x.id === active.id ? "current" : ""}>
                      <td>
                        <button
                          className="linkbtn name-btn"
                          onClick={() => {
                            switchTo(x.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          title="Open this portfolio"
                        >
                          <i className="tab-dot" style={{ background: x.color }} />
                          {x.name}
                        </button>
                      </td>
                      <td>{x.count}</td>
                      <td>{money(x.cost)}</td>
                      <td>{money(x.value)}</td>
                      <td className={x.pl >= 0 ? "up" : "down"}>
                        {signedMoney(x.pl)} ({pct(x.plPct)})
                      </td>
                      <td className={x.day >= 0 ? "up" : "down"}>
                        {signedMoney(x.day)} ({pct(x.dayPct)})
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>All portfolios</td>
                    <td>{all.count}</td>
                    <td>{money(all.cost)}</td>
                    <td>{money(all.value)}</td>
                    <td className={all.pl >= 0 ? "up" : "down"}>
                      {signedMoney(all.pl)} ({pct(all.plPct)})
                    </td>
                    <td className={all.day >= 0 ? "up" : "down"}>
                      {signedMoney(all.day)} ({pct(all.dayPct)})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      <footer className="footer">
        <div className="actions">
          <button className="action-btn small" onClick={backupAll} title="Save all your portfolios into one file">
            <Icon d={ICONS.download} /> Back up everything
          </button>
          <button
            className="action-btn small"
            onClick={() => restoreRef.current && restoreRef.current.click()}
            title="Load portfolios from a backup file"
          >
            <Icon d={ICONS.upload} /> Restore backup
          </button>
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              restoreFromFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p>
          Your portfolios are saved in this browser only. Use "Back up everything" to keep a copy or move them to
          another device.
        </p>
        <p>
          Prices come from Yahoo Finance through server.py and can be delayed. A "simulated" or "no price" tag means a
          live price couldn't be fetched. Pocketfolio is a learning project, not financial advice.
        </p>
      </footer>

      {chartFor && <ChartModal target={chartFor} onClose={() => setChartFor(null)} />}

      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.undo && (
            <button
              className="toast-btn"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Start the app: put <App /> inside the <div id="root"> in index.html
ReactDOM.createRoot(document.getElementById("root")).render(<App />);