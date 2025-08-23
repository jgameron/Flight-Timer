// Flight Times Logger PWA
(() => {
  const $ = (sel) => document.querySelector(sel);

  const stateKey = "ftl.v1.times";
  let deferredPrompt = null;

  const els = {
    offLocal: $("#off-local"),
    offUTC: $("#off-utc"),
    outLocal: $("#out-local"),
    outUTC: $("#out-utc"),
    inLocal: $("#in-local"),
    inUTC: $("#in-utc"),
    onLocal: $("#on-local"),
    onUTC: $("#on-utc"),
    airHHMM: $("#air-hhmm"),
    airDecimals: $("#air-decimals"),
    blockHHMM: $("#block-hhmm"),
    blockDecimals: $("#block-decimals"),
    tz: $("#tz"),
    btns: {
      off: $("#btn-off"),
      out: $("#btn-out"),
      in: $("#btn-in"),
      on: $("#btn-on"),
      reset: $("#btn-reset"),
      copy: $("#btn-copy"),
      install: $("#btn-install")
    },
    installUI: $("#install-ui")
  };

  const emptyTimes = { off:null, out:null, in:null, on:null };
  const loadTimes = () => {
    try {
      const raw = localStorage.getItem(stateKey);
      if (!raw) return { ...emptyTimes };
      const parsed = JSON.parse(raw);
      return { ...emptyTimes, ...parsed };
    } catch (e) {
      console.warn("Failed to load times:", e);
      return { ...emptyTimes };
    }
  };
  let times = loadTimes();

  const saveTimes = () => {
    localStorage.setItem(stateKey, JSON.stringify(times));
  };

  function toLocalString(d) {
    return new Date(d).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
  function toUTCString(d) {
    const dt = new Date(d);
    return dt.toISOString().replace("T", " ").replace("Z", "Z (UTC)");
  }

  function minutesBetween(a, b) {
    if (!a || !b) return null;
    const ms = new Date(b) - new Date(a);
    if (ms < 0) return null;
    return Math.round(ms / 60000); // minutes
  }

  function fmtHHMM(mins) {
    if (mins == null) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

  function fmtDecimals(mins) {
    if (mins == null) return { dec:"—", tenths:"—" };
    const hours = mins / 60;
    const dec = hours.toFixed(2);                 // decimal hours, e.g. 1.75
    const tenths = (Math.round(hours*10)/10).toFixed(1); // tenths, e.g. 1.8
    return { dec, tenths };
  }

  function render() {
    // Stamp fields
    if (times.off) {
      els.offLocal.textContent = toLocalString(times.off);
      els.offUTC.textContent = toUTCString(times.off);
    } else { els.offLocal.textContent = "—"; els.offUTC.textContent = "—"; }

    if (times.out) {
      els.outLocal.textContent = toLocalString(times.out);
      els.outUTC.textContent = toUTCString(times.out);
    } else { els.outLocal.textContent = "—"; els.outUTC.textContent = "—"; }

    if (times.in) {
      els.inLocal.textContent = toLocalString(times.in);
      els.inUTC.textContent = toUTCString(times.in);
    } else { els.inLocal.textContent = "—"; els.inUTC.textContent = "—"; }

    if (times.on) {
      els.onLocal.textContent = toLocalString(times.on);
      els.onUTC.textContent = toUTCString(times.on);
    } else { els.onLocal.textContent = "—"; els.onUTC.textContent = "—"; }

    // Totals
    const airMins = minutesBetween(times.off, times.on);
    const blockMins = minutesBetween(times.out, times.in);

    els.airHHMM.textContent = fmtHHMM(airMins);
    const aD = fmtDecimals(airMins);
    els.airDecimals.textContent = `Decimal: ${aD.dec} • Tenths: ${aD.tenths}`;

    els.blockHHMM.textContent = fmtHHMM(blockMins);
    const bD = fmtDecimals(blockMins);
    els.blockDecimals.textContent = `Decimal: ${bD.dec} • Tenths: ${bD.tenths}`;

    // Timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      els.tz.textContent = `${tz} (UTC${offsetHoursString(new Date())})`;
    } catch {
      els.tz.textContent = "Local timezone";
    }
  }

  function offsetHoursString(d) {
    const offsetMin = -d.getTimezoneOffset(); // minutes east of UTC
    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const h = String(Math.floor(abs/60)).padStart(2,"0");
    const m = String(abs%60).padStart(2,"0");
    return `${sign}${h}:${m}`;
  }

  function stamp(which) {
    const now = new Date().toISOString();
    times[which] = now;
    saveTimes();
    render();
  }

  function resetAll() {
    if (!confirm("Clear all times?")) return;
    times = { off:null, out:null, in:null, on:null };
    saveTimes();
    render();
  }

  function copyAll() {
    const lines = [];
    const push = (label, val) => {
      if (!val) { lines.push(`${label}: —`); return; }
      lines.push(`${label}: ${toLocalString(val)} | ${toUTCString(val)}`);
    };
    push("OFF", times.off);
    push("OUT", times.out);
    push("IN", times.in);
    push("ON", times.on);

    const airMins = minutesBetween(times.off, times.on);
    const blockMins = minutesBetween(times.out, times.in);
    const aD = fmtDecimals(airMins);
    const bD = fmtDecimals(blockMins);

    lines.push("");
    lines.push(`AIR (OFF→ON): ${fmtHHMM(airMins)} | Decimal ${aD.dec} | Tenths ${aD.tenths}`);
    lines.push(`BLOCK (OUT→IN): ${fmtHHMM(blockMins)} | Decimal ${bD.dec} | Tenths ${bD.tenths}`);

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch(() => {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Copied!");
    });
  }

  // Wire up UI
  els.btns.off.addEventListener("click", () => stamp("off"));
  els.btns.out.addEventListener("click", () => stamp("out"));
  els.btns.in.addEventListener("click", () => stamp("in"));
  els.btns.on.addEventListener("click", () => stamp("on"));
  els.btns.reset.addEventListener("click", resetAll);
  els.btns.copy.addEventListener("click", copyAll);

  // Install prompt handling
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    els.installUI.style.display = "flex";
  });
  if (els.btns.install) {
    els.btns.install.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      els.installUI.style.display = "none";
      deferredPrompt = null;
    });
  }

  // SW registration
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.error);
    });
  }

  render();
})();
