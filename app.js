// Flight Times Logger PWA
(() => {
  const $ = (sel) => document.querySelector(sel);

  const stateKey = "ftl.v1.times";
  const extraKey = "ftl.v1.extra";
  const tzKey = "ftl.v1.tz";
  const usTimeZones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu"
  ];
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
    tripNumber: $("#trip-number"),
    legNumber: $("#leg-number"),
    hobbsStart: $("#hobbs-start"),
    hobbsEnd: $("#hobbs-end"),
    hobbsTotal: $("#hobbs-total"),
    tachStart: $("#tach-start"),
    tachEnd: $("#tach-end"),
    tachTotal: $("#tach-total"),
    fuelType: $("#fuel-type"),
    fuelStart: $("#fuel-start"),
    fuelStartLbs: $("#fuel-start-lbs"),
    fuelEnd: $("#fuel-end"),
    fuelEndLbs: $("#fuel-end-lbs"),
    hobbsUsed: $("#hobbs-used"),
    tachUsed: $("#tach-used"),
    fuelUsedUSG: $("#fuel-used-usg"),
    fuelUsedLbs: $("#fuel-used-lbs"),
    btns: {
      off: $("#btn-off"),
      out: $("#btn-out"),
      in: $("#btn-in"),
      on: $("#btn-on"),
      offReset: $("#btn-off-reset"),
      outReset: $("#btn-out-reset"),
      inReset: $("#btn-in-reset"),
      onReset: $("#btn-on-reset"),
      reset: $("#btn-reset"),
      nextFlight: $("#btn-next-flight"),
      copy: $("#btn-copy"),
      install: $("#btn-install"),
      hobbsReset: $("#btn-hobbs-reset"),
      tachReset: $("#btn-tach-reset"),
      fuelReset: $("#btn-fuel-reset")
    },
    installUI: $("#install-ui"),
    installCard: $("#install-card")
  };


  const emptyTimes = { off:null, out:null, in:null, on:null };
  const emptyExtra = {
    tripNumber:null,
    legNumber:null,
    hobbsStart:null,
    hobbsEnd:null,
    tachStart:null,
    tachEnd:null,
    fuelType:"100LL",
    fuelStart:null,
    fuelEnd:null
  };
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
  const loadExtra = () => {
    try {
      const raw = localStorage.getItem(extraKey);
      if (!raw) return { ...emptyExtra };
      const parsed = JSON.parse(raw);
      return { ...emptyExtra, ...parsed };
    } catch {
      return { ...emptyExtra };
    }
  };
  const loadTZ = () => {
    try {
      const raw = localStorage.getItem(tzKey);
      if (!raw) {
        return { mode: "auto", tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
      }
      const parsed = JSON.parse(raw);
      if (parsed.mode === "manual" && parsed.tz) return parsed;
      return { mode: "auto", tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
    } catch {
      return { mode: "auto", tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
  };
  let times = loadTimes();
  let extra = loadExtra();
  let tzSetting = loadTZ();
  if (tzSetting.mode === "manual" && !usTimeZones.includes(tzSetting.tz)) {
    tzSetting = { mode: "auto", tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }

  initTZOptions();

  const saveTimes = () => {
    localStorage.setItem(stateKey, JSON.stringify(times));
  };
  const saveExtra = () => {
    localStorage.setItem(extraKey, JSON.stringify(extra));
  };
  const saveTZ = () => {
    localStorage.setItem(tzKey, JSON.stringify(tzSetting));
  };

  function toLocalString(d) {
    const opts = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    if (tzSetting.mode === "manual") opts.timeZone = tzSetting.tz;
    return new Date(d).toLocaleTimeString([], opts);
  }
  function toUTCString(d) {
    return (
      new Date(d).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC"
      }) + "Z"
    );
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

  function formatTimeInput(e){
    let v = e.target.value.replace(/[^0-9]/g, "");
    if (v.length > 6) v = v.slice(0,6);
    if (v.length > 4) v = v.slice(0,2) + ":" + v.slice(2,4) + ":" + v.slice(4);
    else if (v.length > 2) v = v.slice(0,2) + ":" + v.slice(2);
    e.target.value = v;
  }

  function parseLocalTime(val){
    if(!val) return null;
    const trimmed = val.trim();
    if(!trimmed) return null;
    let parts = trimmed.split(":").map((part) => part.trim());
    if(parts.length === 1){
      const digits = parts[0].replace(/[^0-9]/g, "");
      if(digits.length === 4){
        parts = [digits.slice(0,2), digits.slice(2)];
      } else if(digits.length === 6){
        parts = [digits.slice(0,2), digits.slice(2,4), digits.slice(4)];
      } else {
        return null;
      }
    }
    if(parts.length < 2 || parts.length > 3) return null;
    if(parts.some((p) => p === "")) return null;
    const [hStr, mStr, sStr = "0"] = parts;
    const h = Number(hStr);
    const m = Number(mStr);
    const s = Number(sStr);
    if ([h, m, s].some((n) => Number.isNaN(n))) return null;
    if (![h, m, s].every(Number.isInteger)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
    return { h, m, s };
  }

  function updateFromInput(which){
    const parsed = parseLocalTime(els[`${which}Local`].value);
    if(!parsed) return;
    const { h, m, s } = parsed;
    let base;
    if (tzSetting.mode === "manual") {
      const tz = tzSetting.tz;
      const now = times[which] ? new Date(times[which]) : new Date();
      const tzStr = now.toLocaleString("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const tzDate = new Date(tzStr);
      tzDate.setHours(h, m, s, 0);
      const utcStr = tzDate.toLocaleString("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      base = new Date(utcStr);
    } else {
      base = times[which] ? new Date(times[which]) : new Date();
      base.setHours(h, m, s, 0);
    }
    times[which] = base.toISOString();
    saveTimes();
    render();
  }

  function resetOne(which){
    if(!times[which]) return;
    if(!confirm(`Reset ${which.toUpperCase()}?`)) return;
    times[which] = null;
    saveTimes();
    render();
  }

  function updateMeter(which){
    const s = parseFloat(els[`${which}Start`].value);
    const e = parseFloat(els[`${which}End`].value);
    extra[`${which}Start`] = isNaN(s) ? null : s;
    extra[`${which}End`] = isNaN(e) ? null : e;
    saveExtra();
    render();
  }

  function resetMeter(which){
    if(!confirm(`Reset ${which}?`)) return;
    extra[`${which}Start`] = null;
    extra[`${which}End`] = null;
    saveExtra();
    render();
  }

  function updateFuel(which, unit){
    const factor = els.fuelType.value === "JetA" ? 6.67 : 6.0;
    if(which === "start"){
      if(unit === "usg"){
        const s = parseFloat(els.fuelStart.value);
        extra.fuelStart = isNaN(s) ? null : s;
      } else if(unit === "lbs"){
        const sL = parseFloat(els.fuelStartLbs.value);
        extra.fuelStart = isNaN(sL) ? null : sL / factor;
      }
    } else if(which === "end"){
      if(unit === "usg"){
        const e = parseFloat(els.fuelEnd.value);
        extra.fuelEnd = isNaN(e) ? null : e;
      } else if(unit === "lbs"){
        const eL = parseFloat(els.fuelEndLbs.value);
        extra.fuelEnd = isNaN(eL) ? null : eL / factor;
      }
    }
    extra.fuelType = els.fuelType.value;
    saveExtra();
    render();
  }

  function resetFuel(){
    if(!confirm("Reset fuel?")) return;
    extra.fuelStart = null;
    extra.fuelEnd = null;
    saveExtra();
    render();
  }

  function updateTripLeg(){
    const t = parseInt(els.tripNumber.value);
    const l = parseInt(els.legNumber.value);
    extra.tripNumber = isNaN(t) ? null : t;
    extra.legNumber = isNaN(l) ? null : l;
    saveExtra();
    render();
  }

  function render() {
    // Stamp fields
    ["off","out","in","on"].forEach((w) => {
      if(times[w]){
        els[`${w}Local`].value = toLocalString(times[w]);
        els[`${w}UTC`].textContent = toUTCString(times[w]);
        els.btns[w].disabled = true;
        els.btns[`${w}Reset`].disabled = false;
      } else {
        els[`${w}Local`].value = "";
        els[`${w}UTC`].textContent = "—";
        els.btns[w].disabled = false;
        els.btns[`${w}Reset`].disabled = true;
      }
    });

    // Totals
    const blockMins = minutesBetween(times.out, times.in);
    const airMins = minutesBetween(times.off, times.on);

    els.blockHHMM.textContent = fmtHHMM(blockMins);
    const bD = fmtDecimals(blockMins);
    els.blockDecimals.textContent = `Decimal: ${bD.dec} • Tenths: ${bD.tenths}`;

    els.airHHMM.textContent = fmtHHMM(airMins);
    const aD = fmtDecimals(airMins);
    els.airDecimals.textContent = `Decimal: ${aD.dec} • Tenths: ${aD.tenths}`;

    // Extras
    els.tripNumber.value = extra.tripNumber ?? "";
    els.legNumber.value = extra.legNumber ?? "";
    els.hobbsStart.value = extra.hobbsStart ?? "";
    els.hobbsEnd.value = extra.hobbsEnd ?? "";
    const hobbsUsedVal =
      extra.hobbsStart != null && extra.hobbsEnd != null && extra.hobbsEnd >= extra.hobbsStart
        ? extra.hobbsEnd - extra.hobbsStart
        : null;
    const hobbsDisp = hobbsUsedVal != null ? hobbsUsedVal.toFixed(1) : "—";
    els.hobbsTotal.textContent = hobbsDisp;
    els.hobbsUsed.textContent = hobbsDisp;

    els.tachStart.value = extra.tachStart ?? "";
    els.tachEnd.value = extra.tachEnd ?? "";
    const tachUsedVal =
      extra.tachStart != null && extra.tachEnd != null && extra.tachEnd >= extra.tachStart
        ? extra.tachEnd - extra.tachStart
        : null;
    const tachDisp = tachUsedVal != null ? tachUsedVal.toFixed(1) : "—";
    els.tachTotal.textContent = tachDisp;
    els.tachUsed.textContent = tachDisp;

    els.fuelType.value = extra.fuelType || "100LL";
    const factor = extra.fuelType === "JetA" ? 6.67 : 6.0;
    els.fuelStart.value = extra.fuelStart != null ? extra.fuelStart.toFixed(1) : "";
    els.fuelStartLbs.value = extra.fuelStart != null ? (extra.fuelStart * factor).toFixed(1) : "";
    els.fuelEnd.value = extra.fuelEnd != null ? extra.fuelEnd.toFixed(1) : "";
    els.fuelEndLbs.value = extra.fuelEnd != null ? (extra.fuelEnd * factor).toFixed(1) : "";
    const fuelUsedVal =
      extra.fuelStart != null && extra.fuelEnd != null && extra.fuelStart >= extra.fuelEnd
        ? extra.fuelStart - extra.fuelEnd
        : null;
    els.fuelUsedUSG.textContent = fuelUsedVal != null ? `${fuelUsedVal.toFixed(1)} USG` : "—";
    els.fuelUsedLbs.textContent = fuelUsedVal != null ? `${(fuelUsedVal * factor).toFixed(1)} lbs` : "—";

    // Timezone
    try {
      const deviceTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const autoOpt = els.tz.querySelector('option[value="auto"]');
      if (autoOpt) {
        autoOpt.textContent = `Auto: ${deviceTZ} (UTC${offsetHoursStringTZ(deviceTZ)})`;
      }
      els.tz.value = tzSetting.mode === "manual" ? tzSetting.tz : "auto";
    } catch {
      // ignore
    }
  }

  function offsetHoursStringTZ(tz) {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset"
      });
      const tzName = formatter
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value;
      if (tzName) {
        if (tzName === "UTC") return "+00:00";
        const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
        if (match) {
          const [, sign, hours, minutes] = match;
          const h = hours.padStart(2, "0");
          const m = (minutes ?? "00").padStart(2, "0");
          return `${sign}${h}:${m}`;
        }
      }
    } catch {
      // fall through to manual calculation
    }

    try {
      const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      const offsetMin = Math.round((tzDate - utcDate) / 60000);
      const sign = offsetMin >= 0 ? "+" : "-";
      const abs = Math.abs(offsetMin);
      const h = String(Math.floor(abs / 60)).padStart(2, "0");
      const m = String(abs % 60).padStart(2, "0");
      return `${sign}${h}:${m}`;
    } catch {
      // ignore and return UTC as a safe default
    }

    return "+00:00";
  }

  function initTZOptions() {
    try {
      const deviceTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const frag = document.createDocumentFragment();
      const autoOpt = document.createElement("option");
      autoOpt.value = "auto";
      autoOpt.textContent = `Auto: ${deviceTZ} (UTC${offsetHoursStringTZ(deviceTZ)})`;
      frag.appendChild(autoOpt);
      usTimeZones.forEach((tz) => {
        const opt = document.createElement("option");
        opt.value = tz;
        opt.textContent = `${tz} (UTC${offsetHoursStringTZ(tz)})`;
        frag.appendChild(opt);
      });
      els.tz.appendChild(frag);
      els.tz.value = tzSetting.mode === "manual" ? tzSetting.tz : "auto";
    } catch {
      // ignore
    }
  }

  function stamp(which) {
    const now = new Date().toISOString();
    times[which] = now;
    saveTimes();
    render();
  }

  function resetAll() {
    if (!confirm("Reset all data?")) return;
    times = { ...emptyTimes };
    extra = { ...emptyExtra };
    saveTimes();
    saveExtra();
    render();
  }

  function nextFlight() {
    if (!confirm("Start next flight?")) return;
    times = { ...emptyTimes };
    extra.tripNumber = null;
    extra.legNumber = null;
    extra.hobbsStart = extra.hobbsEnd != null ? extra.hobbsEnd : null;
    extra.hobbsEnd = null;
    extra.tachStart = extra.tachEnd != null ? extra.tachEnd : null;
    extra.tachEnd = null;
    extra.fuelStart = extra.fuelEnd != null ? extra.fuelEnd : null;
    extra.fuelEnd = null;
    saveTimes();
    saveExtra();
    render();
  }

  function copyAll() {
    const lines = [];
    if (extra.tripNumber != null || extra.legNumber != null) {
      if (extra.tripNumber != null) lines.push(`Trip: ${extra.tripNumber}`);
      if (extra.legNumber != null) lines.push(`Leg: ${extra.legNumber}`);
      lines.push("");
    }
    const push = (label, val) => {
      if (!val) return;
      lines.push(`${label}: Local ${toLocalString(val)} | UTC ${toUTCString(val)}`);
    };
    push("OUT", times.out);
    push("OFF", times.off);
    push("ON", times.on);
    push("IN", times.in);

    const blockMins = minutesBetween(times.out, times.in);
    const airMins = minutesBetween(times.off, times.on);
    if (airMins != null || blockMins != null) lines.push("");
    if (blockMins != null) {
      const bD = fmtDecimals(blockMins);
      lines.push(`BLOCK (OUT→IN): ${fmtHHMM(blockMins)} | Decimal ${bD.dec} | Tenths ${bD.tenths}`);
    }
    if (airMins != null) {
      const aD = fmtDecimals(airMins);
      lines.push(`AIR (OFF→ON): ${fmtHHMM(airMins)} | Decimal ${aD.dec} | Tenths ${aD.tenths}`);
    }

    const hobbsUsed =
      extra.hobbsStart != null && extra.hobbsEnd != null
        ? (extra.hobbsEnd - extra.hobbsStart).toFixed(1)
        : null;
    const tachUsed =
      extra.tachStart != null && extra.tachEnd != null
        ? (extra.tachEnd - extra.tachStart).toFixed(1)
        : null;
    const fuelFactor = extra.fuelType === "JetA" ? 6.67 : 6.0;
    const fuelUsed = extra.fuelStart != null && extra.fuelEnd != null ? (extra.fuelStart - extra.fuelEnd).toFixed(1) : null;
    const fuelUsedLbs = fuelUsed != null ? (parseFloat(fuelUsed) * fuelFactor).toFixed(1) : null;
    const hobbsStart = extra.hobbsStart != null ? extra.hobbsStart.toFixed(1) : "—";
    const hobbsEnd = extra.hobbsEnd != null ? extra.hobbsEnd.toFixed(1) : "—";
    const tachStart = extra.tachStart != null ? extra.tachStart.toFixed(1) : "—";
    const tachEnd = extra.tachEnd != null ? extra.tachEnd.toFixed(1) : "—";
    const hobbsUsedDisplay = hobbsUsed ?? "—";
    const tachUsedDisplay = tachUsed ?? "—";
    if (
      extra.hobbsStart != null ||
      extra.hobbsEnd != null ||
      extra.tachStart != null ||
      extra.tachEnd != null ||
      hobbsUsed != null ||
      tachUsed != null ||
      fuelUsed != null
    ) {
      lines.push("");
      if (extra.hobbsStart != null || extra.hobbsEnd != null || hobbsUsed != null) {
        lines.push(`HOBBS: Start ${hobbsStart} | End ${hobbsEnd} | Used ${hobbsUsedDisplay}`);
      }
      if (extra.tachStart != null || extra.tachEnd != null || tachUsed != null) {
        lines.push(`TACH: Start ${tachStart} | End ${tachEnd} | Used ${tachUsedDisplay}`);
      }
      if (fuelUsed != null) lines.push(`FUEL USED (${extra.fuelType}): ${fuelUsed} USG | ${fuelUsedLbs} lbs`);
    }

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

  function handleTZChange() {
    const val = els.tz.value;
    if (val === "auto") {
      tzSetting.mode = "auto";
      tzSetting.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } else {
      tzSetting.mode = "manual";
      tzSetting.tz = val;
    }
    saveTZ();
    render();
  }

  // Wire up UI
  els.btns.out.addEventListener("click", () => stamp("out"));
  els.btns.off.addEventListener("click", () => stamp("off"));
  els.btns.on.addEventListener("click", () => stamp("on"));
  els.btns.in.addEventListener("click", () => stamp("in"));
  els.btns.reset.addEventListener("click", resetAll);
  els.btns.nextFlight.addEventListener("click", nextFlight);
  els.btns.copy.addEventListener("click", copyAll);

  ["off","out","in","on"].forEach((w) => {
    const input = els[`${w}Local`];
    input.addEventListener("input", formatTimeInput);
    input.addEventListener("change", () => updateFromInput(w));
    els.btns[`${w}Reset`].addEventListener("click", () => resetOne(w));
  });

  ["hobbs","tach"].forEach((w) => {
    els[`${w}Start`].addEventListener("change", () => updateMeter(w));
    els[`${w}End`].addEventListener("change", () => updateMeter(w));
    els.btns[`${w}Reset`].addEventListener("click", () => resetMeter(w));
  });
  els.fuelType.addEventListener("change", () => updateFuel());
  els.fuelStart.addEventListener("change", () => updateFuel("start","usg"));
  els.fuelStartLbs.addEventListener("change", () => updateFuel("start","lbs"));
  els.fuelEnd.addEventListener("change", () => updateFuel("end","usg"));
  els.fuelEndLbs.addEventListener("change", () => updateFuel("end","lbs"));
  els.btns.fuelReset.addEventListener("click", resetFuel);
  els.tripNumber.addEventListener("change", updateTripLeg);
  els.legNumber.addEventListener("change", updateTripLeg);
  els.tz.addEventListener("change", handleTZChange);

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

  function hideInstallCardIfInstalled(){
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone
    ) {
      els.installCard.style.display = "none";
    }
  }
  hideInstallCardIfInstalled();
  window.addEventListener("appinstalled", () => {
    els.installCard.style.display = "none";
  });

  // SW registration
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          const update = () => reg.update().catch(() => {});
          update();
          window.addEventListener("online", update);
        })
        .catch(console.error);

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    });
  }

  render();
})();
