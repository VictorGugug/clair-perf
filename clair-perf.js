(() => {
  const VERSION = '1.1.0';
  const KEY = 'clair:perf';
  const MODE_KEY = 'clair:perfMode';
  const MODES = ['auto', 'off', 'lite', 'low'];
  const WINDOW_MS = 1500;
  const MIN_SAMPLES = 20;
  const JANK_MS = 25;
  const JANK_WINDOWS = 2;
  const CLEAN_WINDOWS = 8;
  const CLEAN_WINDOWS_LOW = 16;
  const WARMUP_MS = 4000;
  const STYLE_ID = 'clair-perf-style';
  const UI_STYLE_ID = 'clair-perf-ui-style';
  const REPO = 'https://github.com/VictorGugug/clair-perf';
  const ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.2a6.8 6.8 0 1 0 0 13.6A6.8 6.8 0 0 0 8 1.2Zm0 2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 1.4a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm0 1.4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>';

  const read = (key, fallback) => {
    try {
      const value = Spicetify.LocalStorage.get(key);
      if (value !== null && value !== undefined) return String(value);
    } catch {}
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      Spicetify.LocalStorage.set(key, String(value));
      return;
    } catch {}
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  };

  const readMode = () => {
    const value = read(MODE_KEY, 'auto');
    return MODES.includes(value) ? value : 'auto';
  };

  const targets = [
    '.Root__nav-bar',
    '.Root__main-view',
    '.Root__right-sidebar > :not(.LayoutResizer__resize-bar)',
    '.main-nowPlayingBar-container',
  ];
  const rule = (cls) => targets.map((s) => 'html.' + cls + ' body.clair-glass ' + s).join(',');
  const modalRule = (cls) => 'html.' + cls + ' .clair-modal[open]::before';

  const head = document.head || document.documentElement;
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      rule('clair-perf-lite') +
      '{' +
      '-webkit-backdrop-filter:blur(6px) saturate(1.7) brightness(1.06)!important;' +
      'backdrop-filter:blur(6px) saturate(1.7) brightness(1.06)!important;' +
      '}' +
      rule('clair-perf-low') +
      '{' +
      '-webkit-backdrop-filter:none!important;' +
      'backdrop-filter:none!important;' +
      '}' +
      modalRule('clair-perf-lite') +
      '{' +
      '-webkit-backdrop-filter:blur(10px) saturate(1.6)!important;' +
      'backdrop-filter:blur(10px) saturate(1.6)!important;' +
      '}' +
      modalRule('clair-perf-low') +
      '{' +
      '-webkit-backdrop-filter:none!important;' +
      'backdrop-filter:none!important;' +
      '}';
    head.append(style);
  }

  if (!document.getElementById(UI_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = UI_STYLE_ID;
    style.textContent =
      '.cp-ui{display:flex;flex-direction:column;gap:14px;min-width:360px;color:var(--text-base,#fff);font-family:var(--font-family,inherit)}' +
      '.cp-ui *{box-sizing:border-box}' +
      '.cp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}' +
      '.cp-title{font-size:15px;font-weight:700}' +
      '.cp-sub{margin-top:3px;color:var(--text-subdued,#b3b3b3);font-size:12px;line-height:1.45}' +
      '.cp-switch{position:relative;flex:0 0 auto;width:44px;height:24px;cursor:pointer}' +
      '.cp-switch input{position:absolute;width:0;height:0;opacity:0}' +
      '.cp-track{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.18);transition:background .2s}' +
      '.cp-track::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}' +
      '.cp-switch input:checked+.cp-track{background:var(--essential-bright-accent,#1ed760)}' +
      '.cp-switch input:checked+.cp-track::after{transform:translateX(20px)}' +
      '.cp-modes{display:flex;flex-wrap:wrap;gap:6px}' +
      '.cp-mode{padding:6px 10px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:var(--text-base,#fff);font-size:12px;cursor:pointer}' +
      '.cp-mode[data-active="1"]{background:var(--essential-bright-accent,#1ed760);color:#000;font-weight:700}' +
      '.cp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
      '.cp-cell{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.06)}' +
      '.cp-key{display:block;color:var(--text-subdued,#b3b3b3);font-size:10px;letter-spacing:.06em;text-transform:uppercase}' +
      '.cp-val{display:block;margin-top:3px;overflow:hidden;font-size:13px;font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap}' +
      '.cp-foot{color:var(--text-subdued,#b3b3b3);font-size:11px;line-height:1.45}' +
      '.cp-foot a{color:inherit}';
    head.append(style);
  }

  let enabled = read(KEY, '1') !== '0';
  let mode = readMode();
  let level = 'off';
  let forced = false;
  let samples = [];
  let windowStart = 0;
  let startedAt = performance.now();
  let last = 0;
  let raf = 0;
  let frames = 0;
  let windows = 0;
  let jankWindows = 0;
  let cleanWindows = 0;
  let p50 = 0;
  let p90 = 0;
  let themePresent = !!window.ClairTheme;
  let menuItem = null;
  let menuTimer = 0;
  let menuAttempts = 0;
  const time = { off: 0, lite: 0, low: 0 };

  const levelName = (value) => ({ off: 'Off', lite: 'Lite', low: 'Low' }[value] || 'Off');

  const report = () => ({
    version: VERSION,
    enabled,
    mode,
    level,
    forced,
    theme: themePresent,
    p50,
    p90,
    fps: p50 ? Math.round(1000 / p50) : 0,
    frames,
    windows,
    time: {
      off: Math.round(time.off / 1000),
      lite: Math.round(time.lite / 1000),
      low: Math.round(time.low / 1000),
    },
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  });

  const notify = (text) => {
    if (typeof Spicetify !== 'undefined' && typeof Spicetify.showNotification === 'function') {
      Spicetify.showNotification(text, false, 4000);
    } else {
      console.info('[Clair Perf] ' + text);
    }
  };

  const syncMenuState = () => {
    if (menuItem && typeof menuItem.setState === 'function') menuItem.setState(enabled);
  };

  const apply = (next, announce) => {
    level = next;
    document.documentElement.classList.toggle('clair-perf-lite', next === 'lite');
    document.documentElement.classList.toggle('clair-perf-low', next === 'low');
    if (announce && !themePresent) {
      notify(next === 'low' ? 'Clair Perf: glass disabled to keep the UI smooth' : 'Clair Perf: blur reduced to keep the UI smooth');
    }
  };

  const evaluate = (now) => {
    time[level] += now - windowStart;
    const sorted = samples.slice().sort((a, b) => a - b);
    p50 = Math.round(sorted[Math.floor(sorted.length * 0.5)]);
    p90 = Math.round(sorted[Math.floor(sorted.length * 0.9)]);
    windows += 1;
    if (p90 > JANK_MS) {
      jankWindows += 1;
      cleanWindows = 0;
    } else {
      cleanWindows += 1;
      jankWindows = 0;
    }
    if (now - startedAt < WARMUP_MS) {
      jankWindows = 0;
      cleanWindows = 0;
      return;
    }
    if (forced) return;
    const glass = document.body.classList.contains('clair-glass');
    const modal = !!document.querySelector('.clair-modal[open]');
    if (!glass && !modal) {
      if (level !== 'off') apply('off', false);
      jankWindows = 0;
      cleanWindows = 0;
      return;
    }
    if (jankWindows >= JANK_WINDOWS) {
      jankWindows = 0;
      if (level === 'off') apply('lite', true);
      else if (level === 'lite') apply('low', true);
    } else if (cleanWindows >= (level === 'low' ? CLEAN_WINDOWS_LOW : CLEAN_WINDOWS)) {
      cleanWindows = 0;
      if (level === 'low') apply('lite', false);
      else if (level === 'lite') apply('off', false);
    }
  };

  const sample = (now) => {
    raf = 0;
    if (!enabled || document.hidden || !document.hasFocus()) {
      samples = [];
      windowStart = 0;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(sample);
    if (!last) {
      last = now;
      return;
    }
    const dt = now - last;
    last = now;
    if (dt < 1 || dt > 250) return;
    frames += 1;
    if (!windowStart) windowStart = now;
    samples.push(dt);
    if (now - windowStart < WINDOW_MS || samples.length < MIN_SAMPLES) return;
    evaluate(now);
    samples = [];
    windowStart = 0;
  };

  const start = () => {
    if (raf || !enabled) return;
    startedAt = performance.now();
    last = 0;
    samples = [];
    windowStart = 0;
    raf = requestAnimationFrame(sample);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    samples = [];
    windowStart = 0;
    forced = false;
    jankWindows = 0;
    cleanWindows = 0;
    apply('off', false);
  };

  const setEnabled = (value) => {
    enabled = !!value;
    write(KEY, enabled ? '1' : '0');
    if (enabled) {
      mode = readMode();
      forced = mode !== 'auto';
      jankWindows = 0;
      cleanWindows = 0;
      apply(mode === 'auto' ? 'off' : mode, false);
      start();
    } else {
      stop();
    }
    syncMenuState();
    return enabled;
  };

  const set = (next) => {
    if (!MODES.includes(next)) return mode;
    mode = next;
    write(MODE_KEY, mode);
    forced = mode !== 'auto';
    jankWindows = 0;
    cleanWindows = 0;
    if (enabled) apply(mode === 'auto' ? 'off' : mode, false);
    syncMenuState();
    return mode;
  };

  const resume = () => {
    if (enabled && !raf) start();
  };
  addEventListener('focus', resume);
  document.addEventListener('visibilitychange', resume);

  const setStat = (root, key, text) => {
    const node = root.querySelector('[data-stat="' + key + '"]');
    if (node) node.textContent = text;
  };

  const buildPanel = () => {
    const ui = document.createElement('div');
    ui.className = 'cp-ui';
    ui.innerHTML =
      '<div class="cp-head">' +
      '<div><div class="cp-title">Performance governor</div>' +
      '<div class="cp-sub">Watches frame pacing and lowers Clair\'s glass blur only when Spotify is actually dropping frames.</div></div>' +
      '<label class="cp-switch" title="Enable Clair Perf"><input type="checkbox" aria-label="Enable Clair Perf"><span class="cp-track"></span></label>' +
      '</div>' +
      '<div class="cp-modes" role="group" aria-label="Mode">' +
      '<button class="cp-mode" data-mode="auto" title="React to frame pacing">Auto</button>' +
      '<button class="cp-mode" data-mode="off" title="Always full glass">Off</button>' +
      '<button class="cp-mode" data-mode="lite" title="Force the 6px blur">Lite</button>' +
      '<button class="cp-mode" data-mode="low" title="Force no backdrop filter">Low</button>' +
      '</div>' +
      '<div class="cp-grid">' +
      '<div class="cp-cell"><span class="cp-key">State</span><span class="cp-val" data-stat="state">-</span></div>' +
      '<div class="cp-cell"><span class="cp-key">FPS</span><span class="cp-val" data-stat="fps">-</span></div>' +
      '<div class="cp-cell"><span class="cp-key">p90 frame</span><span class="cp-val" data-stat="p90">-</span></div>' +
      '<div class="cp-cell"><span class="cp-key">JS heap</span><span class="cp-val" data-stat="heap">-</span></div>' +
      '<div class="cp-cell"><span class="cp-key">Windows</span><span class="cp-val" data-stat="windows">-</span></div>' +
      '<div class="cp-cell"><span class="cp-key">Low time</span><span class="cp-val" data-stat="time">-</span></div>' +
      '</div>' +
      '<div class="cp-foot"><span data-theme-note>Clair theme not detected. This is the standalone config.</span> ' +
      '<a href="' + REPO + '" target="_blank" rel="noopener noreferrer">Repository</a></div>';
    const input = ui.querySelector('.cp-switch input');
    input.checked = enabled;
    input.onchange = () => setEnabled(input.checked);
    ui.querySelectorAll('.cp-mode').forEach((button) => {
      button.onclick = () => set(button.dataset.mode);
    });
    let timer = 0;
    const refresh = () => {
      const data = report();
      input.checked = data.enabled;
      ui.querySelectorAll('.cp-mode').forEach((button) => {
        button.dataset.active = button.dataset.mode === data.mode ? '1' : '0';
      });
      const note = ui.querySelector('[data-theme-note]');
      if (note) note.textContent = data.theme ? 'Clair theme detected. Use its Experiments tab.' : 'Clair theme not detected. This is the standalone config.';
      setStat(ui, 'state', data.enabled ? levelName(data.level) : 'Disabled');
      setStat(ui, 'fps', data.fps ? data.fps + ' fps' : 'n/a');
      setStat(ui, 'p90', data.p90 ? data.p90 + ' ms' : 'n/a');
      setStat(ui, 'heap', typeof data.heap === 'number' ? data.heap + ' MB' : 'n/a');
      setStat(ui, 'windows', data.windows === undefined ? 'n/a' : String(data.windows));
      setStat(ui, 'time', (data.time && data.time.low ? data.time.low : 0) + 's');
    };
    refresh();
    timer = setInterval(() => {
      if (!ui.isConnected) {
        clearInterval(timer);
        timer = 0;
        return;
      }
      refresh();
    }, 1000);
    return ui;
  };

  const openPanel = () => {
    if (!window.Spicetify?.PopupModal?.display) return;
    Spicetify.PopupModal.display({ title: 'Clair Perf', content: buildPanel(), isLarge: false });
  };

  const registerMenu = () => {
    if (themePresent || menuItem) return true;
    const Menu = window.Spicetify?.Menu;
    if (!Menu?.Item) return false;
    try {
      menuItem = new Menu.Item('Clair Perf', enabled, openPanel, ICON);
      menuItem.register();
      return true;
    } catch {
      menuItem = null;
      return false;
    }
  };

  const scheduleStandalone = () => {
    if (themePresent || menuItem || menuAttempts >= 5) return;
    if (menuTimer) clearTimeout(menuTimer);
    menuTimer = setTimeout(() => {
      menuTimer = 0;
      if (themePresent || menuItem) return;
      if (!registerMenu()) {
        menuAttempts += 1;
        scheduleStandalone();
      }
    }, 2500);
  };

  const setThemePresent = (present) => {
    themePresent = !!present;
    if (themePresent) {
      if (menuTimer) clearTimeout(menuTimer);
      menuTimer = 0;
      if (menuItem) {
        menuItem.deregister();
        menuItem = null;
      }
    } else {
      menuAttempts = 0;
      scheduleStandalone();
    }
    return themePresent;
  };

  window.ClairPerf = {
    version: VERSION,
    get enabled() {
      return enabled;
    },
    get mode() {
      return mode;
    },
    get level() {
      return level;
    },
    get forced() {
      return forced;
    },
    get themePresent() {
      return themePresent;
    },
    report,
    set,
    setEnabled,
    setThemePresent,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
  };

  if (enabled) {
    forced = mode !== 'auto';
    if (mode !== 'auto') apply(mode, false);
    start();
  } else {
    apply('off', false);
  }

  if (!themePresent) scheduleStandalone();
})();
