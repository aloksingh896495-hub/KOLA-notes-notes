// ── Menu ──
function toggleMenu() {
    const btn  = document.getElementById('hamburger-btn');
    const menu = document.getElementById('hamburger-menu');
    const overlay = document.getElementById('menu-overlay');
    btn.classList.toggle('open');
    menu.classList.toggle('open');
    overlay.style.display = menu.classList.contains('open') ? 'block' : 'none';
}
function closeMenu() {
    document.getElementById('hamburger-btn').classList.remove('open');
    document.getElementById('hamburger-menu').classList.remove('open');
    document.getElementById('menu-overlay').style.display = 'none';
}

/* ══════════════════════════════════════════════════════
   SETTINGS / THEME / BACKGROUND
══════════════════════════════════════════════════════ */
const BG_CLASSES = ['bg-galaxy','bg-midnight','bg-ocean','bg-forest','bg-sunset','bg-aurora','bg-light','bg-paper'];

function openSettings() {
    // Check if admin has locked themes
    const locked = localStorage.getItem('kolaThemeLocked') === 'true';
    const themeSection = document.getElementById('theme-settings-section');
    const lockedMsg = document.getElementById('theme-locked-msg');
    if (themeSection) {
        const btns = themeSection.querySelector('#theme-btns');
        if (btns) btns.style.opacity = locked ? '0.4' : '1';
        if (btns) btns.style.pointerEvents = locked ? 'none' : 'auto';
    }
    if (lockedMsg) lockedMsg.classList.toggle('hidden', !locked);
    // Restore active states
    const currentTheme = localStorage.getItem('kolaTheme') || 'dark';
    ['dark','light','auto'].forEach(t => {
        const btn = document.getElementById('tbtn-'+t);
        if(btn) btn.classList.toggle('active', t === currentTheme);
    });
    const currentBg = localStorage.getItem('kolaBg') || 'bg-galaxy';
    BG_CLASSES.forEach(b => {
        const el = document.getElementById('bsw-'+b);
        if(el) el.classList.toggle('active', b === currentBg);
    });
    document.getElementById('settings-modal').classList.add('show');
}
function closeSettings() {
    document.getElementById('settings-modal').classList.remove('show');
}

window.setTheme = function(mode) {
    if(localStorage.getItem('kolaThemeLocked') === 'true') {
        alert('Theme switching has been disabled by the admin.'); return;
    }
    localStorage.setItem('kolaTheme', mode);
    ['dark','light','auto'].forEach(t => {
        const btn = document.getElementById('tbtn-'+t);
        if(btn) btn.classList.toggle('active', t === mode);
    });
    applyTheme();
};

function applyTheme() {
    const mode = localStorage.getItem('kolaTheme') || 'dark';
    const body = document.body;
    if(mode === 'light') {
        body.classList.add('light-mode');
    } else if(mode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.toggle('light-mode', !prefersDark);
    } else {
        body.classList.remove('light-mode');
    }
}

window.setBg = function(bgClass) {
    if(localStorage.getItem('kolaThemeLocked') === 'true') {
        alert('Background switching has been disabled by the admin.'); return;
    }
    localStorage.setItem('kolaBg', bgClass);
    BG_CLASSES.forEach(b => {
        const el = document.getElementById('bsw-'+b);
        if(el) el.classList.toggle('active', b === bgClass);
        document.body.classList.remove(b);
    });
    document.body.classList.add(bgClass);
    // If light bg chosen, also switch to light theme
    if(bgClass === 'bg-light' || bgClass === 'bg-paper') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
};

function applyBg() {
    const bgClass = localStorage.getItem('kolaBg') || 'bg-galaxy';
    BG_CLASSES.forEach(b => document.body.classList.remove(b));
    document.body.classList.add(bgClass);
}

// Admin theme lock toggle
window.toggleThemeLock = function() {
    const locked = localStorage.getItem('kolaThemeLocked') === 'true';
    localStorage.setItem('kolaThemeLocked', (!locked).toString());
    updateThemeLockBtn();
};
window.updateThemeLockBtn = function() {
    const btn = document.getElementById('theme-lock-btn');
    if(!btn) return;
    const locked = localStorage.getItem('kolaThemeLocked') === 'true';
    if(locked) {
        btn.textContent = '🔒 LOCKED';
        btn.style.background = 'rgba(255,60,60,0.15)';
        btn.style.borderColor = 'rgba(255,60,60,0.3)';
        btn.style.color = '#ff5555';
    } else {
        btn.textContent = '✅ ALLOWED';
        btn.style.background = 'rgba(153,50,201,0.15)';
        btn.style.borderColor = 'rgba(153,50,201,0.3)';
        btn.style.color = '#9932C9';
    }
};

// Apply theme & bg on load
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    applyBg();
    // Restore subject view
    const sv = localStorage.getItem('kolaSubjectView');
    if(sv) { window.currentSubjectView = sv; }
});

// ── Tool Modal ──
function openTool(tool) {
    const modal = document.getElementById('tool-modal');
    const body  = document.getElementById('tool-modal-body');
    modal.classList.add('show');
    if (tool === 'advcalc')      { body.innerHTML = advCalcHTML(); initAdvCalc(); }
    if (tool === 'advstopwatch') { body.innerHTML = advStopwatchHTML(); initAdvStopwatch(); }
    if (tool === 'converter')    { body.innerHTML = converterHTML(); setTimeout(populateConverterSelects, 50); }
    if (tool === 'periodic')     body.innerHTML = periodicHTML();
    if (tool === 'formulae')     body.innerHTML = formulaeHTML();
    if (tool === 'timer')        { body.innerHTML = pomodoroHTML(); initPomodoro(); }
}
function closeTool() {
    document.getElementById('tool-modal').classList.remove('show');
    if (window._advSwInterval) { clearInterval(window._advSwInterval); window._advSwInterval = null; }
}

/* ──────────────────────────────
   ADVANCED SCIENTIFIC CALCULATOR
────────────────────────────── */
function advCalcHTML() {
    return `
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-white font-black text-sm"><i class="fa-solid fa-square-root-variable text-[#9932C9] mr-2"></i>Scientific Calculator</h3>
        <button onclick="closeTool()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all text-sm"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="calc-display mb-3">
        <div class="calc-expr" id="advc-hist" style="min-height:16px;font-size:11px;"></div>
        <div class="calc-expr" id="advc-expr" style="font-size:14px;color:rgba(255,255,255,0.5);min-height:18px;"></div>
        <div class="calc-result" id="advc-result" style="font-size:28px;">0</div>
    </div>
    <!-- Angle mode toggle -->
    <div class="flex gap-2 mb-3">
        <button id="advc-deg-btn" onclick="advCalcSetAngle('deg')" class="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all" style="background:rgba(153,50,201,0.15);border:1px solid rgba(153,50,201,0.4);color:#9932C9;">DEG</button>
        <button id="advc-rad-btn" onclick="advCalcSetAngle('rad')" class="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(156,163,175,1);">RAD</button>
        <button onclick="advCalcMemStore()" class="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all" style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#a78bfa;" title="Store in memory">M+</button>
        <button onclick="advCalcMemRecall()" class="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);color:#a78bfa;" title="Recall memory">MR</button>
    </div>
    <!-- Scientific row -->
    <div class="grid grid-cols-5 gap-1.5 mb-1.5">
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('sin')">sin</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('cos')">cos</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('tan')">tan</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('log')">log</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('ln')">ln</button>
    </div>
    <div class="grid grid-cols-5 gap-1.5 mb-2">
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('sqrt')">√x</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcInput('**2')">x²</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcInput('**')">xⁿ</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('inv')">1/x</button>
        <button class="calc-btn cb-op" style="font-size:11px;padding:10px 4px;" onclick="advCalcFunc('pi')">π</button>
    </div>
    <!-- Main keypad -->
    <div class="grid grid-cols-4 gap-2">
        <button class="calc-btn cb-clr col-span-2" onclick="advCalcClear()">AC</button>
        <button class="calc-btn cb-op" onclick="advCalcBackspace()">⌫</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('/')">÷</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('7')">7</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('8')">8</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('9')">9</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('*')">×</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('4')">4</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('5')">5</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('6')">6</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('-')">−</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('1')">1</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('2')">2</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('3')">3</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('+')">+</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('(')">(</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('0')">0</button>
        <button class="calc-btn cb-num" onclick="advCalcInput('.')">.</button>
        <button class="calc-btn cb-eq" onclick="advCalcEquals()">=</button>
        <button class="calc-btn cb-op" onclick="advCalcInput(')')">)</button>
        <button class="calc-btn cb-op" onclick="advCalcInput('%')" style="font-size:12px;">%</button>
        <button class="calc-btn cb-op" onclick="advCalcToggleSign()" style="font-size:12px;">+/−</button>
        <button class="calc-btn cb-op" onclick="advCalcFunc('abs')" style="font-size:11px;">|x|</button>
    </div>
    <p class="text-center text-[9px] text-gray-700 mt-3 uppercase tracking-widest">Memory: <span id="advc-mem-display" class="text-purple-400 font-black">0</span></p>`;
}
let _advcExpr = '', _advcAngle = 'deg', _advcMem = 0;
function initAdvCalc() { _advcExpr = ''; _advcAngle = 'deg'; _advcMem = 0; }
function advCalcSetAngle(mode) {
    _advcAngle = mode;
    const d = document.getElementById('advc-deg-btn'), r = document.getElementById('advc-rad-btn');
    if (d && r) {
        const on  = 'background:rgba(153,50,201,0.15);border:1px solid rgba(153,50,201,0.4);color:#9932C9;';
        const off = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(156,163,175,1);';
        d.style.cssText = mode === 'deg' ? on : off;
        r.style.cssText = mode === 'rad' ? on : off;
    }
}
function advCalcInput(v) {
    _advcExpr += v;
    const el = document.getElementById('advc-expr');
    if (el) el.textContent = _advcExpr.replace(/\*\*/g,'ⁿ').replace(/\*/g,'×').replace(/\//g,'÷');
    advCalcLiveEval();
}
function advCalcLiveEval() {
    try {
        const res = _advCalcEval(_advcExpr);
        const el = document.getElementById('advc-result');
        if (el && isFinite(res)) el.textContent = parseFloat(res.toFixed(10));
    } catch(e) {}
}
function _advCalcEval(expr) {
    const toRad = x => _advcAngle === 'deg' ? x * Math.PI / 180 : x;
    // Replace math functions
    let e = expr
        .replace(/Math\.sin\(/g,'~SIN(')
        .replace(/Math\.cos\(/g,'~COS(')
        .replace(/Math\.tan\(/g,'~TAN(');
    e = e.replace(/\*\*/g, '^^');
    const compute = new Function('"use strict"; const Math=window.Math; return (' + expr.replace(/\*\*/g,'**') + ')');
    return compute();
}
function advCalcFunc(fn) {
    const toRad = x => _advcAngle === 'deg' ? x * Math.PI / 180 : x;
    if (fn === 'pi')   { _advcExpr += String(Math.PI); }
    else if (fn === 'inv')  { if(_advcExpr) { try { const v = Function('"use strict";return(' + _advcExpr + ')')(); _advcExpr = String(1/v); } catch(e){} } }
    else if (fn === 'sqrt') { _advcExpr = `Math.sqrt(${_advcExpr || '0'})`; }
    else if (fn === 'log')  { _advcExpr = `Math.log10(${_advcExpr || '0'})`; }
    else if (fn === 'ln')   { _advcExpr = `Math.log(${_advcExpr || '0'})`; }
    else if (fn === 'abs')  { _advcExpr = `Math.abs(${_advcExpr || '0'})`; }
    else if (fn === 'sin')  { _advcExpr = `Math.sin(${_advcAngle==='deg'?'(Math.PI/180)*':''}(${_advcExpr || '0'}))`; }
    else if (fn === 'cos')  { _advcExpr = `Math.cos(${_advcAngle==='deg'?'(Math.PI/180)*':''}(${_advcExpr || '0'}))`; }
    else if (fn === 'tan')  { _advcExpr = `Math.tan(${_advcAngle==='deg'?'(Math.PI/180)*':''}(${_advcExpr || '0'}))`; }
    const el = document.getElementById('advc-expr');
    if (el) el.textContent = _advcExpr;
    advCalcLiveEval();
}
function advCalcEquals() {
    try {
        const res = Function('"use strict"; const Math=window.Math; return (' + _advcExpr + ')')();
        const hist = document.getElementById('advc-hist');
        const display = document.getElementById('advc-result');
        const expr = document.getElementById('advc-expr');
        if (hist) hist.textContent = _advcExpr + ' =';
        if (display) display.textContent = isFinite(res) ? parseFloat(res.toFixed(10)) : 'Error';
        if (expr) expr.textContent = '';
        _advcExpr = String(res);
    } catch(e) {
        const display = document.getElementById('advc-result');
        if (display) display.textContent = 'Error';
        _advcExpr = '';
    }
}
function advCalcClear() {
    _advcExpr = '';
    ['advc-expr','advc-hist'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = ''; });
    const d = document.getElementById('advc-result'); if(d) d.textContent = '0';
}
function advCalcBackspace() {
    _advcExpr = _advcExpr.slice(0, -1);
    const el = document.getElementById('advc-expr');
    if (el) el.textContent = _advcExpr;
    advCalcLiveEval();
}
function advCalcToggleSign() {
    if (_advcExpr.startsWith('-')) _advcExpr = _advcExpr.slice(1);
    else _advcExpr = '-' + _advcExpr;
    const el = document.getElementById('advc-expr');
    if (el) el.textContent = _advcExpr;
    advCalcLiveEval();
}
function advCalcMemStore() {
    try {
        const v = Function('"use strict"; const Math=window.Math; return (' + (_advcExpr||'0') + ')')();
        _advcMem = isFinite(v) ? v : 0;
        const el = document.getElementById('advc-mem-display'); if(el) el.textContent = _advcMem;
    } catch(e) {}
}
function advCalcMemRecall() {
    _advcExpr += String(_advcMem);
    const el = document.getElementById('advc-expr');
    if (el) el.textContent = _advcExpr;
    advCalcLiveEval();
}

/* ──────────────────────────────
   UNIT CONVERTER
────────────────────────────── */
function converterHTML() {
    return `
    <div class="flex items-center justify-between mb-5">
        <h3 class="text-white font-black text-base"><i class="fa-solid fa-right-left text-cyan-400 mr-2"></i>Unit Converter</h3>
        <button onclick="closeTool()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all text-sm"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="mb-4">
        <select class="converter-select mb-3" id="conv-type" onchange="convertUnits()">
            <option value="length">Length</option>
            <option value="weight">Weight / Mass</option>
            <option value="temp">Temperature</option>
            <option value="area">Area</option>
            <option value="speed">Speed</option>
        </select>
        <div class="grid grid-cols-2 gap-3 mb-3">
            <select class="converter-select" id="conv-from" onchange="convertUnits()"></select>
            <select class="converter-select" id="conv-to"   onchange="convertUnits()"></select>
        </div>
        <input type="number" class="converter-input mb-3" id="conv-value" placeholder="Enter value" oninput="convertUnits()" value="1">
        <div class="bg-[#9932C9]/06 border border-[#9932C9]/20 rounded-xl p-4 text-center">
            <p class="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Result</p>
            <p class="text-2xl font-black text-[#9932C9] orbitron" id="conv-result">—</p>
        </div>
    </div>`;
}
const convUnits = {
    length: { m:1, km:1000, cm:0.01, mm:0.001, ft:0.3048, inch:0.0254, mile:1609.344, yard:0.9144 },
    weight: { kg:1, g:0.001, mg:0.000001, lb:0.453592, oz:0.0283495, tonne:1000 },
    area:   { 'm²':1, 'km²':1e6, 'cm²':0.0001, 'ft²':0.092903, acre:4046.86, hectare:10000 },
    speed:  { 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 },
    temp:   { Celsius:0, Fahrenheit:0, Kelvin:0 }
};
function populateConverterSelects() {
    const type = document.getElementById('conv-type').value;
    const keys = Object.keys(convUnits[type]);
    ['conv-from','conv-to'].forEach((id,i) => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.innerHTML = keys.map((k,j) => `<option value="${k}" ${j===i?'selected':''}>${k}</option>`).join('');
    });
    convertUnits();
}
function convertUnits() {
    const type = document.getElementById('conv-type');
    const from = document.getElementById('conv-from');
    const to   = document.getElementById('conv-to');
    const val  = document.getElementById('conv-value');
    const res  = document.getElementById('conv-result');
    if(!type||!from||!to||!val||!res) return;
    if(!from.options.length) { populateConverterSelects(); return; }
    const v = parseFloat(val.value);
    if(isNaN(v)) { res.textContent = '—'; return; }
    let result;
    if(type.value === 'temp') {
        const f = from.value, t = to.value;
        let c;
        if(f==='Celsius') c=v;
        else if(f==='Fahrenheit') c=(v-32)*5/9;
        else c=v-273.15;
        if(t==='Celsius') result=c;
        else if(t==='Fahrenheit') result=c*9/5+32;
        else result=c+273.15;
    } else {
        const units = convUnits[type.value];
        result = v * units[from.value] / units[to.value];
    }
    res.textContent = parseFloat(result.toFixed(6)) + ' ' + to.value;
}
/* ──────────────────────────────
   PERIODIC TABLE QUICK REF
────────────────────────────── */
function periodicHTML() {
    const els = [
        {s:'H',n:'Hydrogen',a:1,m:'1.008'},{s:'He',n:'Helium',a:2,m:'4.003'},
        {s:'Li',n:'Lithium',a:3,m:'6.941'},{s:'Be',n:'Beryllium',a:4,m:'9.012'},
        {s:'B',n:'Boron',a:5,m:'10.81'},{s:'C',n:'Carbon',a:6,m:'12.011'},
        {s:'N',n:'Nitrogen',a:7,m:'14.007'},{s:'O',n:'Oxygen',a:8,m:'15.999'},
        {s:'F',n:'Fluorine',a:9,m:'18.998'},{s:'Ne',n:'Neon',a:10,m:'20.18'},
        {s:'Na',n:'Sodium',a:11,m:'22.99'},{s:'Mg',n:'Magnesium',a:12,m:'24.305'},
        {s:'Al',n:'Aluminium',a:13,m:'26.982'},{s:'Si',n:'Silicon',a:14,m:'28.086'},
        {s:'P',n:'Phosphorus',a:15,m:'30.974'},{s:'S',n:'Sulphur',a:16,m:'32.06'},
        {s:'Cl',n:'Chlorine',a:17,m:'35.45'},{s:'Ar',n:'Argon',a:18,m:'39.948'},
        {s:'K',n:'Potassium',a:19,m:'39.098'},{s:'Ca',n:'Calcium',a:20,m:'40.078'},
        {s:'Fe',n:'Iron',a:26,m:'55.845'},{s:'Cu',n:'Copper',a:29,m:'63.546'},
        {s:'Zn',n:'Zinc',a:30,m:'65.38'},{s:'Ag',n:'Silver',a:47,m:'107.868'},
        {s:'Au',n:'Gold',a:79,m:'196.967'},{s:'Hg',n:'Mercury',a:80,m:'200.592'},
        {s:'Pb',n:'Lead',a:82,m:'207.2'},{s:'U',n:'Uranium',a:92,m:'238.029'}
    ];
    return `
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-white font-black text-base"><i class="fa-solid fa-table-cells text-emerald-400 mr-2"></i>Element Lookup</h3>
        <button onclick="closeTool()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all text-sm"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <input type="text" placeholder="Search element or symbol…" oninput="filterElements(this.value)"
        class="converter-input mb-4" id="elem-search">
    <div class="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1" id="elem-grid">
        ${els.map(e => `
        <div class="elem-card bg-white/5 hover:bg-[#9932C9]/08 border border-white/5 hover:border-[#9932C9]/25 rounded-xl p-2 text-center cursor-pointer transition-all"
             data-name="${e.n.toLowerCase()}" data-sym="${e.s.toLowerCase()}"
             onclick="document.getElementById('elem-detail').innerHTML='<b class=\\'text-[#9932C9]\\'>${e.s}</b> — ${e.n} | Z=${e.a} | M=${e.m} g/mol'">
            <div class="text-[10px] text-gray-600">${e.a}</div>
            <div class="text-white font-black text-sm">${e.s}</div>
            <div class="text-[9px] text-gray-500 truncate">${e.n.substring(0,6)}</div>
        </div>`).join('')}
    </div>
    <div class="mt-3 p-3 bg-[#9932C9]/05 border border-[#9932C9]/15 rounded-xl text-sm text-gray-300" id="elem-detail">Tap an element for details</div>`;
}
/* ──────────────────────────────
   ADVANCED STOPWATCH + SESSION TRACKER
────────────────────────────── */
function advStopwatchHTML() {
    // Session time (time since login on this device)
    const sessionStart = parseInt(localStorage.getItem('kolaSessionStart') || Date.now());
    const sessionElapsed = Math.round((Date.now() - sessionStart) / 1000);
    // PDF tracker from localStorage
    const tracker = JSON.parse(localStorage.getItem('kolaPDFTracker') || '{}');
    const pdfRows = Object.entries(tracker).sort((a,b) => b[1].views - a[1].views);
    const totalPDFSecs = pdfRows.reduce((s,[,d]) => s + (d.totalSeconds||0), 0);

    function fmtS(s) {
        if(!s) return '0s';
        const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
        return h>0 ? `${h}h ${m}m ${sec}s` : m>0 ? `${m}m ${sec}s` : `${sec}s`;
    }

    return `
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-white font-black text-sm"><i class="fa-solid fa-stopwatch-20 text-orange-400 mr-2"></i>Smart Stopwatch</h3>
        <button onclick="closeTool()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all text-sm"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <!-- Live stopwatch -->
    <div class="timer-display" id="advsw-display" style="font-size:42px;">00:00.00</div>
    <div class="flex gap-2 mb-3">
        <button onclick="advSwStart()" id="advsw-start-btn" class="timer-btn flex-1" style="background:linear-gradient(135deg,#9932C9,#b44de0);color:#000;font-size:12px;">
            <i class="fa-solid fa-play mr-1"></i> Start
        </button>
        <button onclick="advSwStop()" class="timer-btn flex-1" style="background:rgba(255,255,255,0.07);color:white;border:1px solid rgba(255,255,255,0.1);font-size:12px;">
            <i class="fa-solid fa-pause mr-1"></i> Pause
        </button>
        <button onclick="advSwReset()" class="timer-btn" style="background:rgba(255,60,60,0.15);color:#ff4444;">
            <i class="fa-solid fa-rotate-left"></i>
        </button>
    </div>
    <div class="flex gap-2 mb-4">
        <button onclick="advSwLap()" class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-[#9932C9]/10 text-white text-xs font-bold border border-white/10 hover:border-[#9932C9]/30 transition-all">
            <i class="fa-solid fa-flag mr-1 text-[#9932C9]"></i> Lap
        </button>
        <button onclick="advSwCopyLaps()" class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold border border-white/10 transition-all">
            <i class="fa-solid fa-copy mr-1"></i> Copy Laps
        </button>
    </div>
    <div id="advsw-laps" class="max-h-24 overflow-y-auto space-y-1 pr-1 mb-4"></div>

    <!-- Session Stats -->
    <div class="p-4 rounded-2xl mb-3" style="background:rgba(153,50,201,0.06);border:1px solid rgba(153,50,201,0.15);">
        <p class="text-[9px] text-[#9932C9] font-black uppercase tracking-widest mb-2">⏱ This Session</p>
        <div class="grid grid-cols-2 gap-3">
            <div class="text-center">
                <p class="text-white font-black text-base orbitron" id="advsw-session-live">${fmtS(sessionElapsed)}</p>
                <p class="text-gray-600 text-[9px] uppercase tracking-widest">On Website</p>
            </div>
            <div class="text-center">
                <p class="text-indigo-400 font-black text-base orbitron">${fmtS(totalPDFSecs)}</p>
                <p class="text-gray-600 text-[9px] uppercase tracking-widest">In PDFs Total</p>
            </div>
        </div>
    </div>

    <!-- Per-PDF tracker -->
    ${pdfRows.length > 0 ? `
    <div>
        <p class="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">📄 PDF Time Breakdown</p>
        <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
            ${pdfRows.map(([name, d]) => `
            <div class="flex items-center justify-between p-2 rounded-xl text-xs" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="fa-solid fa-file-pdf text-[#9932C9] text-[10px] flex-shrink-0"></i>
                    <span class="text-gray-300 truncate max-w-[140px] font-bold">${name}</span>
                </div>
                <div class="flex gap-3 text-right flex-shrink-0">
                    <div><span class="text-[#9932C9] font-black orbitron text-xs">${fmtS(d.totalSeconds)}</span><p class="text-gray-700 text-[8px]">time</p></div>
                    <div><span class="text-indigo-400 font-black orbitron text-xs">${d.views}</span><p class="text-gray-700 text-[8px]">views</p></div>
                </div>
            </div>`).join('')}
        </div>
        <button onclick="if(confirm('Clear PDF tracker?')){localStorage.removeItem('kolaPDFTracker');closeTool();}" class="mt-2 text-[9px] text-red-500/40 hover:text-red-400 w-full text-center transition-all">Clear PDF history</button>
    </div>` : `<p class="text-gray-600 text-[10px] text-center italic">Open PDFs to see your time breakdown here.</p>`}`;
}

let _advSwMs = 0, _advSwRunning = false, _advSwLapCount = 0, _advSwLapLast = 0;
window._advSwInterval = null;
let _advSessionInterval = null;

function initAdvStopwatch() {
    _advSwMs = 0; _advSwRunning = false; _advSwLapCount = 0; _advSwLapLast = 0;
    advSwUpdateDisplay();
    // Live session counter
    if (_advSessionInterval) clearInterval(_advSessionInterval);
    _advSessionInterval = setInterval(() => {
        const start = parseInt(localStorage.getItem('kolaSessionStart') || Date.now());
        const secs = Math.round((Date.now() - start) / 1000);
        const el = document.getElementById('advsw-session-live');
        if (el) {
            const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
            el.textContent = h>0 ? `${h}h ${m}m ${s}s` : m>0 ? `${m}m ${s}s` : `${s}s`;
        } else { clearInterval(_advSessionInterval); }
    }, 1000);
}

function advSwUpdateDisplay() {
    const el = document.getElementById('advsw-display');
    if (!el) return;
    const mins = Math.floor(_advSwMs/60000);
    const secs = Math.floor((_advSwMs%60000)/1000);
    const cs   = Math.floor((_advSwMs%1000)/10);
    el.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}
function advSwStart() {
    if (_advSwRunning) return;
    _advSwRunning = true;
    const btn = document.getElementById('advsw-start-btn');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle text-red-400 mr-1"></i> Running'; btn.style.opacity = '0.8'; }
    window._advSwInterval = setInterval(() => { _advSwMs += 10; advSwUpdateDisplay(); }, 10);
}
function advSwStop() {
    if (!_advSwRunning) return;
    _advSwRunning = false;
    clearInterval(window._advSwInterval);
    const btn = document.getElementById('advsw-start-btn');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-play mr-1"></i> Start'; btn.style.opacity = '1'; }
}
function advSwReset() {
    advSwStop(); _advSwMs = 0; _advSwLapCount = 0; _advSwLapLast = 0; advSwUpdateDisplay();
    const laps = document.getElementById('advsw-laps');
    if (laps) laps.innerHTML = '';
}
function advSwLap() {
    if (!_advSwRunning && _advSwMs === 0) return;
    _advSwLapCount++;
    const lapTime = _advSwMs - _advSwLapLast;
    _advSwLapLast = _advSwMs;
    function fmt(ms) {
        const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),cs=Math.floor((ms%1000)/10);
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    }
    const laps = document.getElementById('advsw-laps');
    if (laps) laps.innerHTML = `
        <div class="flex justify-between p-2 rounded-lg text-xs" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">
            <span class="text-gray-400 font-bold">Lap ${_advSwLapCount}</span>
            <span class="text-yellow-400 font-black orbitron">${fmt(lapTime)}</span>
            <span class="text-[#9932C9] font-black orbitron">${fmt(_advSwMs)}</span>
        </div>` + laps.innerHTML;
}
function advSwCopyLaps() {
    const laps = document.getElementById('advsw-laps');
    if (!laps || !laps.children.length) { alert('No laps recorded yet!'); return; }
    let text = 'KOLA BRO Lap Times\n';
    Array.from(laps.children).reverse().forEach((el, i) => {
        const spans = el.querySelectorAll('span');
        text += `Lap ${i+1}: ${spans[1]?.textContent || ''} (Total: ${spans[2]?.textContent || ''})\n`;
    });
    navigator.clipboard?.writeText(text).then(() => alert('✅ Lap times copied!')).catch(() => alert('Copy failed'));
}

/* ──────────────────────────────
   AUTH HELPERS
────────────────────────────── */
window.switchAuthTab = function(tab) {
    const loginPanel    = document.getElementById('auth-login-panel');
    const registerPanel = document.getElementById('auth-register-panel');
    const loginBtn      = document.getElementById('tab-login');
    const registerBtn   = document.getElementById('tab-register');
    const activeStyle   = 'bg-gradient-to-r from-[#9932C9] to-[#b44de0] text-black';
    const inactiveStyle = 'text-gray-400';
    if(tab === 'login') {
        loginPanel.classList.remove('hidden');
        registerPanel.classList.add('hidden');
        loginBtn.className    = `flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStyle}`;
        registerBtn.className = `flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inactiveStyle}`;
    } else {
        registerPanel.classList.remove('hidden');
        loginPanel.classList.add('hidden');
        registerBtn.className = `flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStyle}`;
        loginBtn.className    = `flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inactiveStyle}`;
    }
};
window.togglePwd = function(id, btn) {
    const input = document.getElementById(id);
    if(input.type === 'password') { input.type = 'text'; btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>'; }
    else { input.type = 'password'; btn.innerHTML = '<i class="fa-solid fa-eye"></i>'; }
};
window.logoutUser = function() {
    if(!confirm('Sign out of KOLA BRO?')) return;
    localStorage.removeItem('kolaSession');
    localStorage.removeItem('kolaSessionStart');
    location.reload();
};

/* ──────────────────────────────
   MULTI-SOUND BUTTON SYSTEM
────────────────────────────── */
(function() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    let ctx = null;
    function getCtx() { if(!ctx) ctx = new AudioCtx(); return ctx; }

    function playClick() {     // nav / menu items → soft click
        try { const c=getCtx(),o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.type='sine'; o.frequency.setValueAtTime(660,c.currentTime); o.frequency.exponentialRampToValueAtTime(440,c.currentTime+0.07); g.gain.setValueAtTime(0.15,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.10); o.start(); o.stop(c.currentTime+0.10); } catch(e) {}
    }
    function playAction() {    // primary action buttons → punchy pop
        try { const c=getCtx(),o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.type='triangle'; o.frequency.setValueAtTime(1200,c.currentTime); o.frequency.exponentialRampToValueAtTime(300,c.currentTime+0.12); g.gain.setValueAtTime(0.25,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.18); o.start(); o.stop(c.currentTime+0.18); } catch(e) {}
    }
    function playSuccess() {   // upload / confirm → success chime
        try { const c=getCtx(); [523,659,784].forEach((f,i)=>{ const o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0,c.currentTime+i*0.08); g.gain.linearRampToValueAtTime(0.15,c.currentTime+i*0.08+0.02); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.08+0.15); o.start(c.currentTime+i*0.08); o.stop(c.currentTime+i*0.08+0.2); }); } catch(e) {}
    }
    function playCard() {      // subject/chapter cards → soft thud
        try { const c=getCtx(),o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.type='square'; o.frequency.setValueAtTime(180,c.currentTime); o.frequency.exponentialRampToValueAtTime(60,c.currentTime+0.09); g.gain.setValueAtTime(0.12,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.09); o.start(); o.stop(c.currentTime+0.09); } catch(e) {}
    }
    function playClose() {     // close / back / delete → soft down
        try { const c=getCtx(),o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination); o.type='sine'; o.frequency.setValueAtTime(440,c.currentTime); o.frequency.exponentialRampToValueAtTime(220,c.currentTime+0.08); g.gain.setValueAtTime(0.12,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.10); o.start(); o.stop(c.currentTime+0.10); } catch(e) {}
    }

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('button, [onclick]');
        if(!btn) return;
        const txt = (btn.textContent || '').toLowerCase();
        const id  = btn.id || '';
        const cls = btn.className || '';
        // Route to correct sound
        if(cls.includes('btn-action') || id.includes('access') || txt.includes('upload') || txt.includes('create account')) { playAction(); return; }
        if(txt.includes('✅') || txt.includes('upload pdf')) { playSuccess(); return; }
        if(txt.includes('close') || txt.includes('×') || txt.includes('back') || txt.includes('logout') || btn.querySelector('.fa-xmark') || btn.querySelector('.fa-arrow-left') || btn.querySelector('.fa-trash')) { playClose(); return; }
        if(cls.includes('card-hover') || cls.includes('chapter-row') || e.target.closest('.card-hover')) { playCard(); return; }
        playClick(); // default
    }, true);
})();

/* ──────────────────────────────
   FORMULA SHEET
────────────────────────────── */
function formulaeHTML() {
    const formulas = [
        { cat:'Physics', items:[
            { n:'Newton\'s 2nd Law', f:'F = m × a' },
            { n:'Kinetic Energy',    f:'KE = ½mv²' },
            { n:'Potential Energy',  f:'PE = mgh' },
            { n:'Ohm\'s Law',       f:'V = I × R' },
            { n:'Speed',            f:'v = d / t' },
            { n:'Momentum',         f:'p = m × v' },
            { n:'Power',            f:'P = W / t' },
            { n:'Pressure',         f:'P = F / A' },
        ]},
        { cat:'Math', items:[
            { n:'Area of Circle',   f:'A = πr²' },
            { n:'Circumference',    f:'C = 2πr' },
            { n:'Pythagoras',       f:'a² + b² = c²' },
            { n:'Quadratic',        f:'x = (−b ± √(b²−4ac)) / 2a' },
            { n:'Area of Triangle', f:'A = ½ × b × h' },
            { n:'Simple Interest',  f:'SI = (P × R × T) / 100' },
        ]},
        { cat:'Chemistry', items:[
            { n:'Molar Mass',       f:'M = mass / moles' },
            { n:'Ideal Gas Law',    f:'PV = nRT' },
            { n:'Density',          f:'ρ = m / V' },
            { n:'pH',               f:'pH = −log[H⁺]' },
        ]}
    ];
    return `
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-white font-black text-base"><i class="fa-solid fa-square-root-variable text-red-400 mr-2"></i>Formula Sheet</h3>
        <button onclick="closeTool()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all text-sm"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="max-h-72 overflow-y-auto space-y-4 pr-1">
        ${formulas.map(cat => `
        <div>
            <p class="text-[10px] uppercase tracking-widest text-[#9932C9] font-bold mb-2">${cat.cat}</p>
            <div class="space-y-1">
                ${cat.items.map(f => `
                <div class="flex items-center justify-between p-3 bg-white/4 hover:bg-white/7 rounded-xl border border-white/5 transition-all">
                    <span class="text-gray-400 text-xs">${f.n}</span>
                    <span class="text-white font-bold text-sm font-mono">${f.f}</span>
                </div>`).join('')}
            </div>
        </div>`).join('')}
    </div>`;
}


/* ── FEEDBACK STAR RATING ── */
window.setFbStar = function(val) {
    document.getElementById('fb-rating-val').value = val;
    document.querySelectorAll('.fb-star').forEach(function(star) {
        var starVal = parseInt(star.getAttribute('data-v'));
        if (starVal <= val) {
            star.classList.add('lit');
        } else {
            star.classList.remove('lit');
        }
    });
};

window.pickFbCat = function(el, cat) {
    document.querySelectorAll('.fb-cat').forEach(function(b) { b.classList.remove('sel'); });
    el.classList.add('sel');
    document.getElementById('fb-cat-val').value = cat;
};

/* Open feedback page pre-filled with a specific PDF */
window.openFeedbackFor = function(pdfName) {
    navigateTo('step-feedback');
    setTimeout(() => {
        const sel = document.getElementById('fb-subject');
        if (sel) {
            // Try to match an option, else add one
            let found = false;
            for (let opt of sel.options) {
                if (opt.value === pdfName) { sel.value = pdfName; found = true; break; }
            }
            if (!found) {
                const opt = document.createElement('option');
                opt.value = pdfName; opt.textContent = pdfName;
                sel.appendChild(opt); sel.value = pdfName;
            }
        }
    }, 100);
};

/* ══════════════════════════════════════════════════════════════
   NOTIFICATION UI HELPERS (type-tab switching only — data lives in Firestore)
══════════════════════════════════════════════════════════════ */

/* Admin: switch notification type tabs */
window.switchNotifType = function(type) {
    ['text','image','video'].forEach(t => {
        const btn   = document.getElementById('ntab-' + t);
        const panel = document.getElementById('notif-panel-' + t);
        if (btn)   btn.classList.toggle('active', t === type);
        if (panel) panel.classList.toggle('hidden', t !== type);
    });
};


/* ══════════════════════════════════════════════════════════════════════
   KOLA BRO — COMPLETE FEATURE ENGINE
   XP · LEVELS · STREAKS · PROGRESS · PROFILE · TIMETABLE · POMODORO
   All data → Firebase (userProgress collection) + localStorage cache
══════════════════════════════════════════════════════════════════════ */

/* ── CONSTANTS ── */
const XP_PER_LEVEL = 100;
const LEVELS = [
  { min:0,   label:'Rookie',      color:'#6b7280', emoji:'🌱' },
  { min:100, label:'Scholar',     color:'#3b82f6', emoji:'📘' },
  { min:250, label:'Expert',      color:'#8b5cf6', emoji:'⚡' },
  { min:500, label:'Master',      color:'#f59e0b', emoji:'🏆' },
  { min:900, label:'Legend',      color:'#ef4444', emoji:'👑' },
  { min:1500,label:'Elite',       color:'#9932C9', emoji:'💎' },
];
const BADGES_DEF = [
  { id:'first_login',   emoji:'🎉', name:'Welcome!',       desc:'Logged in for the first time',       xp:10  },
  { id:'first_pdf',     emoji:'📄', name:'First PDF',       desc:'Opened your first PDF',              xp:15  },
  { id:'streak_3',      emoji:'🔥', name:'On Fire',         desc:'3-day login streak',                 xp:30  },
  { id:'streak_7',      emoji:'💥', name:'Week Warrior',    desc:'7-day login streak',                 xp:75  },
  { id:'chap_5',        emoji:'📚', name:'Chapter Hunter',  desc:'Completed 5 chapters',               xp:50  },
  { id:'chap_10',       emoji:'🎓', name:'Bookworm',        desc:'Completed 10 chapters',              xp:100 },
  { id:'feedback_1',    emoji:'💬', name:'Voice Heard',     desc:'Submitted your first feedback',      xp:20  },
  { id:'timer_1',       emoji:'⏱️', name:'Time Keeper',     desc:'Completed a Pomodoro session',       xp:25  },
  { id:'timer_5',       emoji:'⏰', name:'Focus Master',    desc:'Completed 5 Pomodoro sessions',      xp:60  },
  { id:'timetable_set', emoji:'📅', name:'Planner',         desc:'Created your weekly timetable',      xp:40  },
  { id:'all_subjects',  emoji:'🌟', name:'All Rounder',     desc:'Opened all subjects at least once',  xp:80  },
];

/* ── DATA LAYER ── */
function sessionEmail() {
    const s = JSON.parse(localStorage.getItem('kolaSession') || '{}');
    return s.email || null;
}
function getKolaData() {
    try { return JSON.parse(localStorage.getItem('kolaData') || '{}'); } catch(e) { return {}; }
}
function setKolaData(data) {
    localStorage.setItem('kolaData', JSON.stringify(data));
    // async sync to Firebase
    const email = sessionEmail();
    if (email && window.db) {
        try {
            import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
            .then(({ doc, setDoc }) => {
                setDoc(doc(window.db, 'userProgress', email), { ...data, email, updatedAt: new Date() }, { merge: true })
                .catch(e => {});
            }).catch(e=>{});
        } catch(e) {}
    }
}
async function syncKolaDataFromFirebase() {
    const email = sessionEmail();
    if (!email || !window.db) return;
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const snap = await getDoc(doc(window.db, 'userProgress', email));
        if (snap.exists()) {
            const remote = snap.data();
            const local  = getKolaData();
            // Merge: take whichever xp is higher
            const merged = { ...local, ...remote, xp: Math.max(local.xp||0, remote.xp||0) };
            localStorage.setItem('kolaData', JSON.stringify(merged));
        }
    } catch(e) {}
}

/* ── XP ENGINE ── */
function getCurrentLevel(xp) {
    let lvl = LEVELS[0];
    for (const L of LEVELS) { if (xp >= L.min) lvl = L; else break; }
    return lvl;
}
function getLevelNumber(xp) {
    let n = 1;
    for (const L of LEVELS) { if (xp >= L.min) n++; else break; }
    return n - 1;
}
function addXP(amount, reason) {
    const d = getKolaData();
    d.xp = (d.xp || 0) + amount;
    d.xpHistory = d.xpHistory || [];
    d.xpHistory.push({ amount, reason, at: Date.now() });
    if (d.xpHistory.length > 50) d.xpHistory = d.xpHistory.slice(-50);
    setKolaData(d);
    showXPToast(amount, reason);
    injectXPBadge();
    checkBadges();
}
function showXPToast(amount, reason) {
    const old = document.getElementById('xp-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'xp-toast';
    t.innerHTML = `⚡ +${amount} XP <span style="font-weight:500;opacity:0.8;font-size:11px;">${reason}</span>`;
    t.style.cssText = `position:fixed;bottom:90px;right:16px;z-index:9999;
        background:linear-gradient(135deg,#7c3aed,#9932C9);color:white;
        padding:10px 18px;border-radius:14px;font-size:13px;font-weight:900;
        box-shadow:0 8px 30px rgba(153,50,201,0.5);
        animation:slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1);`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 2500);
}

/* ── STREAK SYSTEM ── */
function checkAndUpdateStreak() {
    const d = getKolaData();
    const today = new Date().toDateString();
    const history = d.streakHistory || [];
    if (!history.includes(today)) {
        history.push(today);
        // Keep only last 30 days
        while (history.length > 30) history.shift();
        d.streakHistory = history;
        // Calculate streak
        let streak = 0;
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const check = new Date(now); check.setDate(now.getDate() - i);
            if (history.includes(check.toDateString())) streak++;
            else break;
        }
        d.streak = streak;
        // Award XP for streak milestones
        if (streak === 1 && !d.badges?.includes('first_login')) addXP(10, 'First Login');
        if (streak === 3) { awardBadge('streak_3'); }
        if (streak === 7) { awardBadge('streak_7'); }
        setKolaData(d);
    }
}

/* ── BADGE ENGINE ── */
function awardBadge(id) {
    const d = getKolaData();
    d.badges = d.badges || [];
    if (d.badges.includes(id)) return;
    d.badges.push(id);
    setKolaData(d);
    const def = BADGES_DEF.find(b => b.id === id);
    if (def) {
        addXP(def.xp, `Badge: ${def.name}`);
        showBadgeToast(def);
    }
}
function showBadgeToast(def) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:140px;right:16px;z-index:9999;
        background:#111;border:2px solid #f59e0b;color:white;
        padding:12px 18px;border-radius:16px;font-size:12px;font-weight:700;
        box-shadow:0 8px 30px rgba(245,158,11,0.4);max-width:220px;
        animation:slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1);`;
    t.innerHTML = `<div style="font-size:22px;margin-bottom:2px;">${def.emoji}</div>
        <div style="color:#f59e0b;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Badge Unlocked!</div>
        <div style="font-weight:900;margin:2px 0;">${def.name}</div>
        <div style="color:#9ca3af;font-size:10px;">${def.desc}</div>`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='0.4s'; setTimeout(()=>t.remove(),400); }, 3500);
}
function checkBadges() {
    const d = getKolaData();
    const done = Object.keys(d.chaptersDone || {}).length;
    if (done >= 5)  awardBadge('chap_5');
    if (done >= 10) awardBadge('chap_10');
    const fb = d.feedbackCount || 0;
    if (fb >= 1) awardBadge('feedback_1');
    const tm = d.pomodoroCount || 0;
    if (tm >= 1) awardBadge('timer_1');
    if (tm >= 5) awardBadge('timer_5');
    if (d.timetableSet) awardBadge('timetable_set');
}

/* ══════════════════════════════════════════════════════════════════════
   PROGRESS TRACKER PAGE
══════════════════════════════════════════════════════════════════════ */
window.renderProgressPage = function() {
    const d = getKolaData();
    const done = d.chaptersDone || {};
    const subjects = window._kolaSubjects || [];

    let totalDone = 0, totalChaps = 0;
    const subjectData = subjects.map(s => {
        const chaps = (s.chapters || []).length;
        const chapsDone = (s.chapters || []).filter(c => done[c.id || (s.name+'_'+c.name)]).length;
        totalDone += chapsDone; totalChaps += chaps;
        return { ...s, chaps, chapsDone };
    });

    const pct = totalChaps > 0 ? Math.round(totalDone / totalChaps * 100) : 0;
    const el = id => document.getElementById(id);
    if(el('prog-overall-pct')) el('prog-overall-pct').textContent = pct + '%';
    if(el('prog-overall-bar')) el('prog-overall-bar').style.width = pct + '%';
    if(el('prog-done-count'))  el('prog-done-count').textContent = totalDone + ' chapters done';
    if(el('prog-total-count')) el('prog-total-count').textContent = totalChaps + ' total';

    const list = el('prog-subjects-list');
    if (!list) return;
    if (subjectData.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-xs text-center py-8">No subjects found. Visit Subjects page first.</p>';
        return;
    }
    list.innerHTML = subjectData.map(s => {
        const p = s.chaps > 0 ? Math.round(s.chapsDone / s.chaps * 100) : 0;
        const col = p === 100 ? '#10b981' : p > 50 ? '#9932C9' : p > 0 ? '#f59e0b' : '#4b5563';
        return `<div class="glass-ui p-5 mb-4">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span style="font-size:22px;">${s.emoji||'📚'}</span>
                    <div>
                        <p class="text-white font-black text-sm">${s.name}</p>
                        <p class="text-gray-500 text-xs">${s.chapsDone} / ${s.chaps} chapters</p>
                    </div>
                </div>
                <span style="color:${col};font-weight:900;font-size:18px;font-family:'Orbitron',monospace;">${p}%</span>
            </div>
            <div style="height:6px;border-radius:10px;background:rgba(255,255,255,0.06);overflow:hidden;">
                <div style="height:100%;width:${p}%;background:${col};border-radius:10px;transition:width 0.8s;"></div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4">
                ${(s.chapters||[]).slice(0,6).map(c => {
                    const cid = c.id || (s.name+'_'+c.name);
                    const isDone = !!done[cid];
                    return `<div onclick="toggleChapterDone('${cid}','${s.name}')" style="cursor:pointer;padding:8px;border-radius:10px;border:1px solid ${isDone?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.06)'};background:${isDone?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.02)'};text-align:center;transition:0.2s;">
                        <span style="font-size:10px;font-weight:700;color:${isDone?'#10b981':'#6b7280'};">${isDone?'✅':'○'}</span>
                        <p style="font-size:9px;color:${isDone?'#d1fae5':'#9ca3af'};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</p>
                    </div>`;
                }).join('')}
                ${s.chapters && s.chapters.length > 6 ? `<div style="padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);text-align:center;"><p style="font-size:9px;color:#6b7280;">+${s.chapters.length-6} more</p></div>` : ''}
            </div>
        </div>`;
    }).join('');
};

window.toggleChapterDone = function(chapId, subjectName) {
    const d = getKolaData();
    d.chaptersDone = d.chaptersDone || {};
    if (d.chaptersDone[chapId]) {
        delete d.chaptersDone[chapId];
    } else {
        d.chaptersDone[chapId] = Date.now();
        addXP(20, `Chapter done: ${chapId.split('_').pop()}`);
    }
    setKolaData(d);
    checkBadges();
    renderProgressPage();
};

window.resetProgress = function() {
    if (!confirm('Reset ALL chapter progress? XP is kept.')) return;
    const d = getKolaData();
    d.chaptersDone = {};
    setKolaData(d);
    renderProgressPage();
};

/* ══════════════════════════════════════════════════════════════════════
   PROFILE + XP PAGE
══════════════════════════════════════════════════════════════════════ */
window.renderProfilePage = async function() {
    await syncKolaDataFromFirebase();
    const d   = getKolaData();
    const s   = JSON.parse(localStorage.getItem('kolaSession') || '{}');
    const xp  = d.xp || 0;
    const lvlDef = getCurrentLevel(xp);
    const lvlNum = getLevelNumber(xp);
    const xpInLevel = xp - lvlDef.min;
    const nextLvl = LEVELS.find(L => L.min > xp);
    const xpToNext = nextLvl ? nextLvl.min - xp : 0;
    const xpForLvl = nextLvl ? nextLvl.min - lvlDef.min : XP_PER_LEVEL;
    const pct = Math.min(100, Math.round(xpInLevel / xpForLvl * 100));

    const el = id => document.getElementById(id);
    const name = s.name || 'Student';
    if(el('prof-avatar')) el('prof-avatar').textContent = name[0].toUpperCase();
    if(el('prof-name'))   el('prof-name').textContent = name;
    if(el('prof-class'))  el('prof-class').textContent = 'Class ' + (s.class || '—') + ' · ' + (s.email || '');
    if(el('prof-level-badge')) {
        el('prof-level-badge').textContent = `${lvlDef.emoji} ${lvlDef.label} (Lvl ${lvlNum})`;
        el('prof-level-badge').style.background = `linear-gradient(135deg,${lvlDef.color},${lvlDef.color}99)`;
    }
    const streak = d.streak || 0;
    if(el('prof-streak-badge')) el('prof-streak-badge').textContent = `🔥 ${streak} day streak`;
    if(el('prof-xp-txt'))  el('prof-xp-txt').textContent = `${xp} XP total`;
    if(el('prof-xp-bar'))  el('prof-xp-bar').style.width = pct + '%';
    if(el('prof-xp-next')) el('prof-xp-next').textContent = nextLvl ? `${xpToNext} XP to ${nextLvl.label}` : '🏆 MAX LEVEL!';

    // Stats
    const chapsDone = Object.keys(d.chaptersDone || {}).length;
    if(el('st-chap')) el('st-chap').textContent = chapsDone;
    if(el('st-games')) el('st-games').textContent = d.pomodoroCount || 0;
    if(el('st-feedback')) el('st-feedback').textContent = d.feedbackCount || 0;

    // 7-day streak calendar
    const cal = el('streak-calendar');
    if (cal) {
        const history = d.streakHistory || [];
        cal.innerHTML = Array.from({length:7}).map((_,i) => {
            const dd = new Date(); dd.setDate(dd.getDate() - (6-i));
            const active = history.includes(dd.toDateString());
            const label = ['S','M','T','W','T','F','S'][dd.getDay()];
            return `<div style="text-align:center;">
                <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid ${active?'#f97316':'rgba(255,255,255,0.08)'};background:${active?'rgba(249,115,22,0.2)':'rgba(255,255,255,0.03)'};">
                    ${active?'🔥':'○'}
                </div>
                <p style="color:#6b7280;font-size:9px;margin-top:3px;">${label}</p>
            </div>`;
        }).join('');
        if(el('streak-msg')) el('streak-msg').textContent = streak >= 7 ? `🎉 Amazing! ${streak}-day streak!` : `${streak} day streak — keep going!`;
    }

    // Badges
    const badgesEl = el('badges-grid');
    if (badgesEl) {
        const earned = d.badges || [];
        badgesEl.innerHTML = BADGES_DEF.map(b => {
            const has = earned.includes(b.id);
            return `<div style="padding:10px;border-radius:14px;border:1px solid ${has?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.05)'};background:${has?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.02)'};text-align:center;opacity:${has?1:0.35};" title="${b.desc} (+${b.xp} XP)">
                <div style="font-size:26px;margin-bottom:4px;">${b.emoji}</div>
                <p style="font-size:9px;font-weight:900;color:${has?'#fbbf24':'#9ca3af'};">${b.name}</p>
                <p style="font-size:8px;color:#6b7280;margin-top:1px;">+${b.xp} XP</p>
            </div>`;
        }).join('');
    }
};

/* ══════════════════════════════════════════════════════════════════════
   STUDY TIMETABLE — Firebase-backed, per-user
══════════════════════════════════════════════════════════════════════ */
const TT_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const TT_SLOTS = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
                  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
                  '6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM'];
const TT_SUBJECTS = ['Physics','Chemistry','Math','Biology','English','History','Geography','Economics','Computer','Hindi','Sanskrit','Art','PE','Free','Revision','Test Prep'];
const TT_COLORS   = {
    'Physics':'#3b82f6','Chemistry':'#10b981','Math':'#f59e0b','Biology':'#84cc16',
    'English':'#a78bfa','History':'#f97316','Geography':'#06b6d4','Economics':'#ec4899',
    'Computer':'#8b5cf6','Hindi':'#ef4444','Sanskrit':'#d97706','Art':'#e879f9',
    'PE':'#22c55e','Free':'#6b7280','Revision':'#9932C9','Test Prep':'#dc2626',
};

let _ttData = {};

async function loadTimetableFromFirebase() {
    const email = sessionEmail();
    if (!email || !window.db) {
        const local = localStorage.getItem('kolaTimetable');
        _ttData = local ? JSON.parse(local) : {};
        return;
    }
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const snap = await getDoc(doc(window.db, 'timetables', email));
        if (snap.exists()) {
            _ttData = snap.data().slots || {};
        } else {
            const local = localStorage.getItem('kolaTimetable');
            _ttData = local ? JSON.parse(local) : {};
        }
    } catch(e) {
        const local = localStorage.getItem('kolaTimetable');
        _ttData = local ? JSON.parse(local) : {};
    }
}

async function saveTimetableToFirebase() {
    localStorage.setItem('kolaTimetable', JSON.stringify(_ttData));
    const email = sessionEmail();
    if (!email || !window.db) return;
    try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await setDoc(doc(window.db, 'timetables', email), { email, slots: _ttData, updatedAt: new Date() });
        const d = getKolaData();
        if (!d.timetableSet) { d.timetableSet = true; setKolaData(d); checkBadges(); }
    } catch(e) {}
}

window.renderTimetable = async function() {
    await loadTimetableFromFirebase();
    buildTimetableDOM();
    highlightCurrentSlot();
};

function buildTimetableDOM() {
    const head = document.getElementById('tt-head');
    const body = document.getElementById('tt-body');
    const legend = document.getElementById('tt-legend');
    if (!head || !body) return;

    // Header
    head.innerHTML = `<th style="padding:8px 6px;color:#6b7280;font-size:10px;text-align:left;min-width:72px;">Time</th>` +
        TT_DAYS.map(d => `<th style="padding:8px 4px;color:#9932C9;font-size:11px;font-weight:900;text-align:center;min-width:80px;">${d}</th>`).join('');

    // Body
    const today = TT_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    body.innerHTML = TT_SLOTS.map((slot, si) => {
        const cells = TT_DAYS.map((day, di) => {
            const key = `${day}_${si}`;
            const val = _ttData[key] || '';
            const col = TT_COLORS[val] || '';
            const isToday = day === today;
            const bg = val ? `${col}22` : (isToday ? 'rgba(153,50,201,0.04)' : 'transparent');
            const border = val ? `1px solid ${col}55` : `1px solid rgba(255,255,255,0.04)`;
            return `<td style="padding:2px;">
                <div onclick="openSlotPicker('${day}',${si},'${key}')"
                     data-slot="${key}"
                     style="min-height:52px;border-radius:10px;border:${border};background:${bg};
                            display:flex;flex-direction:column;align-items:center;justify-content:center;
                            cursor:pointer;transition:0.2s;padding:6px 4px;
                            ${isToday?'outline:1px solid rgba(153,50,201,0.3);':''}">
                    ${val ? `
                        <div style="font-size:9px;font-weight:900;color:${col};text-align:center;line-height:1.2;">${val}</div>
                        <div onclick="clearSlot(event,'${key}')" style="font-size:8px;color:rgba(239,68,68,0.5);margin-top:3px;cursor:pointer;">✕</div>
                    ` : `<div style="color:rgba(255,255,255,0.08);font-size:16px;">+</div>`}
                </div>
            </td>`;
        }).join('');
        return `<tr>
            <td style="padding:4px 6px 4px 2px;color:#4b5563;font-size:9px;white-space:nowrap;vertical-align:middle;">${slot}</td>
            ${cells}
        </tr>`;
    }).join('');

    // Legend
    const used = [...new Set(Object.values(_ttData).filter(Boolean))];
    if (legend) {
        legend.innerHTML = used.length === 0 ? '<p style="color:#4b5563;font-size:11px;">No subjects assigned yet. Tap any slot to add one!</p>' :
            used.map(s => `<div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:8px;border:1px solid ${TT_COLORS[s]||'#6b7280'}44;background:${TT_COLORS[s]||'#6b7280'}11;">
                <span style="width:8px;height:8px;border-radius:50%;background:${TT_COLORS[s]||'#6b7280'};flex-shrink:0;"></span>
                <span style="color:${TT_COLORS[s]||'#9ca3af'};font-size:10px;font-weight:700;">${s}</span>
            </div>`).join('');
    }

    // Stats bar
    const statsEl = document.getElementById('tt-stats');
    if (statsEl) {
        const filledSlots = Object.values(_ttData).filter(Boolean).length;
        const totalSlots  = TT_DAYS.length * TT_SLOTS.length;
        statsEl.textContent = `${filledSlots} / ${totalSlots} slots filled`;
    }
}

function highlightCurrentSlot() {
    const now = new Date();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const day = TT_DAYS[dayIdx];
    const hour = now.getHours();
    let slotIdx = -1;
    TT_SLOTS.forEach((s, i) => {
        const h = parseInt(s);
        const isPM = s.includes('PM') && h !== 12;
        const realH = isPM ? h + 12 : (s.includes('AM') && h === 12 ? 0 : h);
        if (realH <= hour) slotIdx = i;
    });
    if (slotIdx >= 0) {
        const key = `${day}_${slotIdx}`;
        const el = document.querySelector(`[data-slot="${key}"]`);
        if (el) el.style.outline = '2px solid #9932C9';
    }
}

window.openSlotPicker = function(day, slotIdx, key) {
    const existing = _ttData[key] || '';
    const old = document.getElementById('tt-picker');
    if (old) old.remove();

    const picker = document.createElement('div');
    picker.id = 'tt-picker';
    picker.style.cssText = `position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);`;
    picker.innerHTML = `
        <div style="background:#111;border:1px solid rgba(153,50,201,0.3);border-radius:24px;padding:24px;width:320px;max-height:80vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.8);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="color:white;font-weight:900;font-size:14px;">📅 ${day} — ${TT_SLOTS[slotIdx]}</h3>
                <button onclick="document.getElementById('tt-picker').remove()" style="color:#9ca3af;background:rgba(255,255,255,0.05);border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${TT_SUBJECTS.map(s => `
                    <button onclick="assignSlot('${key}','${s}')"
                        style="padding:10px 8px;border-radius:12px;border:1px solid ${TT_COLORS[s]||'#6b7280'}55;background:${TT_COLORS[s]||'#6b7280'}18;
                               color:${TT_COLORS[s]||'#9ca3af'};font-size:11px;font-weight:900;cursor:pointer;transition:0.2s;
                               ${existing===s?'outline:2px solid '+TT_COLORS[s]:''}">
                        ${s}
                    </button>`).join('')}
                <button onclick="assignSlot('${key}','')" style="padding:10px;border-radius:12px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.1);color:#f87171;font-size:11px;font-weight:900;cursor:pointer;grid-column:span 2;">
                    🗑️ Clear This Slot
                </button>
            </div>
        </div>`;
    document.body.appendChild(picker);
    picker.addEventListener('click', e => { if (e.target === picker) picker.remove(); });
};

window.assignSlot = async function(key, subject) {
    if (subject) _ttData[key] = subject;
    else delete _ttData[key];
    const picker = document.getElementById('tt-picker');
    if (picker) picker.remove();
    await saveTimetableToFirebase();
    buildTimetableDOM();
    highlightCurrentSlot();
};

window.clearSlot = async function(e, key) {
    e.stopPropagation();
    delete _ttData[key];
    await saveTimetableToFirebase();
    buildTimetableDOM();
    highlightCurrentSlot();
};

window.clearTimetable = async function() {
    if (!confirm('Clear entire timetable?')) return;
    _ttData = {};
    await saveTimetableToFirebase();
    buildTimetableDOM();
};

/* ══════════════════════════════════════════════════════════════════════
   POMODORO / STUDY TIMER (professional, with XP rewards)
══════════════════════════════════════════════════════════════════════ */
let _pomo = { mode:'work', workMin:25, shortMin:5, longMin:20, rounds:4, current:0, secs:0, running:false, timer:null, sessionsDone:0 };

function pomodoroHTML() {
    return `
    <div style="text-align:center;padding:4px 0 8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="color:white;font-weight:900;font-size:14px;"><i class="fa-solid fa-clock" style="color:#9932C9;margin-right:8px;"></i>Pomodoro Timer</h3>
            <button onclick="closeTool()" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.05);border:none;color:#9ca3af;cursor:pointer;font-size:13px;">✕</button>
        </div>

        <!-- Mode tabs -->
        <div style="display:flex;gap:6px;margin-bottom:20px;background:rgba(255,255,255,0.04);padding:4px;border-radius:12px;">
            <button id="pm-tab-work"  onclick="pomoSetMode('work')"  style="flex:1;padding:8px;border-radius:9px;border:none;cursor:pointer;font-size:11px;font-weight:900;background:linear-gradient(135deg,#7c3aed,#9932C9);color:white;transition:0.2s;">🍅 Focus</button>
            <button id="pm-tab-short" onclick="pomoSetMode('short')" style="flex:1;padding:8px;border-radius:9px;border:none;cursor:pointer;font-size:11px;font-weight:900;background:transparent;color:#6b7280;transition:0.2s;">☕ Short Break</button>
            <button id="pm-tab-long"  onclick="pomoSetMode('long')"  style="flex:1;padding:8px;border-radius:9px;border:none;cursor:pointer;font-size:11px;font-weight:900;background:transparent;color:#6b7280;transition:0.2s;">🌙 Long Break</button>
        </div>

        <!-- Timer display -->
        <div id="pm-ring-wrap" style="position:relative;width:160px;height:160px;margin:0 auto 20px;">
            <svg width="160" height="160" style="transform:rotate(-90deg)">
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
                <circle id="pm-ring" cx="80" cy="80" r="70" fill="none" stroke="#9932C9" stroke-width="8"
                        stroke-dasharray="440" stroke-dashoffset="0" stroke-linecap="round" style="transition:stroke-dashoffset 1s;"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div id="pm-display" style="font-family:'Orbitron',monospace;font-size:36px;font-weight:900;color:white;letter-spacing:2px;">25:00</div>
                <div id="pm-mode-lbl" style="font-size:10px;color:#9932C9;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:2px;">Focus Time</div>
            </div>
        </div>

        <!-- Round indicators -->
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:16px;">
            ${Array.from({length:4}).map((_,i) => `<div class="pm-dot" id="pm-dot-${i}" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.1);transition:0.3s;"></div>`).join('')}
        </div>

        <!-- Controls -->
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
            <button onclick="pomoStartStop()" id="pm-start-btn" style="flex:1;padding:14px;border-radius:14px;border:none;cursor:pointer;font-size:13px;font-weight:900;background:linear-gradient(135deg,#7c3aed,#9932C9);color:white;">▶ Start</button>
            <button onclick="pomoReset()" style="width:48px;height:48px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#9ca3af;cursor:pointer;font-size:14px;">↺</button>
        </div>

        <!-- Settings -->
        <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:14px;border:1px solid rgba(255,255,255,0.06);">
            <p style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Customize</p>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                    <label style="color:#6b7280;font-size:9px;">Focus (min)</label>
                    <input type="number" id="pm-set-work" value="${_pomo.workMin}" min="1" max="90" onchange="pomoUpdateSetting()"
                        style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:12px;text-align:center;margin-top:3px;">
                </div>
                <div>
                    <label style="color:#6b7280;font-size:9px;">Short (min)</label>
                    <input type="number" id="pm-set-short" value="${_pomo.shortMin}" min="1" max="30" onchange="pomoUpdateSetting()"
                        style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:12px;text-align:center;margin-top:3px;">
                </div>
                <div>
                    <label style="color:#6b7280;font-size:9px;">Long (min)</label>
                    <input type="number" id="pm-set-long" value="${_pomo.longMin}" min="5" max="60" onchange="pomoUpdateSetting()"
                        style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:12px;text-align:center;margin-top:3px;">
                </div>
            </div>
        </div>

        <div style="margin-top:12px;text-align:center;">
            <span style="background:rgba(153,50,201,0.1);border:1px solid rgba(153,50,201,0.2);color:#9932C9;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;">
                ⚡ Sessions today: <span id="pm-sessions-done">${_pomo.sessionsDone}</span>
            </span>
        </div>
    </div>`;
}

function initPomodoro() {
    _pomo.running = false;
    _pomo.timer && clearInterval(_pomo.timer);
    _pomo.secs = _pomo.workMin * 60;
    _pomo.mode = 'work';
    _pomo.current = 0;
    updatePomodoroDisplay();
}

window.pomoSetMode = function(mode) {
    if (_pomo.running) return;
    _pomo.mode = mode;
    _pomo.secs = (mode === 'work' ? _pomo.workMin : mode === 'short' ? _pomo.shortMin : _pomo.longMin) * 60;
    const colors = { work:'linear-gradient(135deg,#7c3aed,#9932C9)', short:'linear-gradient(135deg,#059669,#10b981)', long:'linear-gradient(135deg,#1d4ed8,#3b82f6)' };
    const labels = { work:'Focus Time', short:'Short Break', long:'Long Break' };
    ['work','short','long'].forEach(m => {
        const btn = document.getElementById('pm-tab-'+m);
        if (btn) btn.style.background = m===mode ? colors[m] : 'transparent';
        if (btn) btn.style.color = m===mode ? 'white' : '#6b7280';
    });
    const ring = document.getElementById('pm-ring');
    if (ring) ring.style.stroke = mode==='work'?'#9932C9':mode==='short'?'#10b981':'#3b82f6';
    const lbl = document.getElementById('pm-mode-lbl');
    if (lbl) { lbl.textContent = labels[mode]; lbl.style.color = mode==='work'?'#9932C9':mode==='short'?'#10b981':'#3b82f6'; }
    updatePomodoroDisplay();
};

window.pomoStartStop = function() {
    _pomo.running = !_pomo.running;
    const btn = document.getElementById('pm-start-btn');
    if (btn) btn.textContent = _pomo.running ? '⏸ Pause' : '▶ Resume';
    if (_pomo.running) {
        _pomo.timer = setInterval(() => {
            _pomo.secs--;
            updatePomodoroDisplay();
            if (_pomo.secs <= 0) {
                clearInterval(_pomo.timer);
                _pomo.running = false;
                pomoSessionComplete();
            }
        }, 1000);
    } else {
        clearInterval(_pomo.timer);
    }
};

window.pomoReset = function() {
    clearInterval(_pomo.timer);
    _pomo.running = false;
    _pomo.secs = (_pomo.mode==='work'?_pomo.workMin:_pomo.mode==='short'?_pomo.shortMin:_pomo.longMin)*60;
    const btn = document.getElementById('pm-start-btn');
    if (btn) btn.textContent = '▶ Start';
    updatePomodoroDisplay();
};

window.pomoUpdateSetting = function() {
    _pomo.workMin  = parseInt(document.getElementById('pm-set-work')?.value)  || 25;
    _pomo.shortMin = parseInt(document.getElementById('pm-set-short')?.value) || 5;
    _pomo.longMin  = parseInt(document.getElementById('pm-set-long')?.value)  || 20;
    if (!_pomo.running) pomoReset();
};

function updatePomodoroDisplay() {
    const m = Math.floor(_pomo.secs / 60);
    const s = _pomo.secs % 60;
    const el = document.getElementById('pm-display');
    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // Update ring
    const totalSecs = (_pomo.mode==='work'?_pomo.workMin:_pomo.mode==='short'?_pomo.shortMin:_pomo.longMin)*60;
    const pct = _pomo.secs / totalSecs;
    const ring = document.getElementById('pm-ring');
    if (ring) ring.style.strokeDashoffset = 440 * (1 - pct);
    // Dots
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('pm-dot-'+i);
        if (dot) dot.style.background = i < _pomo.current ? '#9932C9' : 'rgba(255,255,255,0.1)';
    }
}

function pomoSessionComplete() {
    if (_pomo.mode === 'work') {
        _pomo.current++;
        _pomo.sessionsDone++;
        const sd = document.getElementById('pm-sessions-done');
        if (sd) sd.textContent = _pomo.sessionsDone;
        // Award XP
        addXP(25, 'Pomodoro session completed');
        const d = getKolaData();
        d.pomodoroCount = (d.pomodoroCount || 0) + 1;
        setKolaData(d);
        checkBadges();
        // Auto switch to break
        if (_pomo.current >= _pomo.rounds) {
            _pomo.current = 0;
            pomoSetMode('long');
        } else {
            pomoSetMode('short');
        }
        // Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🍅 Focus session done!', { body: 'Take a break, you earned it!' });
        }
    } else {
        pomoSetMode('work');
    }
    const btn = document.getElementById('pm-start-btn');
    if (btn) btn.textContent = '▶ Start';
}

/* ══════════════════════════════════════════════════════════════════════
   ADMIN: VIEW USER TIMETABLE (injected into user analytics page)
══════════════════════════════════════════════════════════════════════ */
const _origShowUserAnalytics = window.showUserAnalytics;
window.showUserAnalytics = async function(email, name) {
    if (_origShowUserAnalytics) await _origShowUserAnalytics(email, name);
    // Also load timetable + XP for this user
    setTimeout(async () => {
        await loadAdminUserXPAndTT(email);
    }, 500);
};

async function loadAdminUserXPAndTT(email) {
    if (!window.db) return;
    const container = document.getElementById('ua-pdf-list');
    if (!container) return;

    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        // Load XP data
        const progSnap = await getDoc(doc(window.db, 'userProgress', email));
        const ttSnap   = await getDoc(doc(window.db, 'timetables', email));

        let xpHTML = '', ttHTML = '';

        if (progSnap.exists()) {
            const pd = progSnap.data();
            const xp  = pd.xp || 0;
            const lvl = getCurrentLevel(xp);
            const lvlN = getLevelNumber(xp);
            const badges = pd.badges || [];
            xpHTML = `
            <div style="background:rgba(153,50,201,0.07);border:1px solid rgba(153,50,201,0.2);border-radius:20px;padding:20px;margin-top:20px;">
                <h4 style="color:#9932C9;font-weight:900;font-size:13px;margin-bottom:12px;">⚡ XP & Level</h4>
                <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
                    <div style="text-align:center;"><p style="font-size:22px;font-weight:900;color:#a78bfa;">${xp}</p><p style="font-size:9px;color:#6b7280;text-transform:uppercase;">Total XP</p></div>
                    <div style="text-align:center;"><p style="font-size:22px;font-weight:900;color:${lvl.color};">${lvl.emoji} ${lvlN}</p><p style="font-size:9px;color:#6b7280;text-transform:uppercase;">Level</p></div>
                    <div style="text-align:center;"><p style="font-size:22px;font-weight:900;color:#f97316;">${pd.streak||0}</p><p style="font-size:9px;color:#6b7280;text-transform:uppercase;">Streak</p></div>
                    <div style="text-align:center;"><p style="font-size:22px;font-weight:900;color:#10b981;">${Object.keys(pd.chaptersDone||{}).length}</p><p style="font-size:9px;color:#6b7280;text-transform:uppercase;">Chapters</p></div>
                    <div style="text-align:center;"><p style="font-size:22px;font-weight:900;color:#f59e0b;">${pd.pomodoroCount||0}</p><p style="font-size:9px;color:#6b7280;text-transform:uppercase;">Pomodoros</p></div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${BADGES_DEF.map(b => {
                        const has = badges.includes(b.id);
                        return `<span style="opacity:${has?1:0.3};background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,${has?0.3:0.1});border-radius:8px;padding:3px 8px;font-size:10px;font-weight:700;color:${has?'#fbbf24':'#6b7280'};">${b.emoji} ${b.name}</span>`;
                    }).join('')}
                </div>
            </div>`;
        }

        if (ttSnap.exists()) {
            const slots = ttSnap.data().slots || {};
            const used = Object.entries(slots).filter(([,v]) => v);
            const subjectCount = {};
            used.forEach(([,v]) => { subjectCount[v] = (subjectCount[v]||0)+1; });
            ttHTML = `
            <div style="background:rgba(6,182,212,0.05);border:1px solid rgba(6,182,212,0.2);border-radius:20px;padding:20px;margin-top:16px;">
                <h4 style="color:#06b6d4;font-weight:900;font-size:13px;margin-bottom:12px;">📅 Timetable Summary (${used.length} slots filled)</h4>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${Object.entries(subjectCount).sort((a,b)=>b[1]-a[1]).map(([s,c]) => `
                        <div style="padding:5px 12px;border-radius:10px;border:1px solid ${TT_COLORS[s]||'#6b7280'}44;background:${TT_COLORS[s]||'#6b7280'}18;color:${TT_COLORS[s]||'#9ca3af'};font-size:11px;font-weight:700;">
                            ${s} <span style="opacity:0.7;">(${c}h)</span>
                        </div>`).join('')}
                </div>
            </div>`;
        }

        if (xpHTML || ttHTML) {
            const extra = document.createElement('div');
            extra.innerHTML = xpHTML + ttHTML;
            container.parentNode.insertBefore(extra, container);
        }
    } catch(e) { console.warn('Admin user XP/TT error:', e); }
}

/* ══ Add tt-stats div to timetable header if missing ══ */
document.addEventListener('DOMContentLoaded', () => {
    const ttContainer = document.getElementById('tt-container');
    if (ttContainer && !document.getElementById('tt-stats')) {
        const statsDiv = document.createElement('p');
        statsDiv.id = 'tt-stats';
        statsDiv.style.cssText = 'text-align:right;color:#6b7280;font-size:10px;margin-bottom:6px;';
        ttContainer.parentNode.insertBefore(statsDiv, ttContainer);
    }
});

/* ══ On PDF open, award XP ══ */
const _origViewPDF = window.viewPDF;
window.viewPDF = async function(url, title) {
    if (_origViewPDF) await _origViewPDF(url, title);
    const d = getKolaData();
    if (!d.firstPDF) {
        d.firstPDF = true; setKolaData(d);
        awardBadge('first_pdf');
    } else {
        addXP(5, 'Opened PDF: ' + (title||'').split(' ').slice(0,3).join(' '));
    }
};

/* ══ On feedback, award XP ══ */
const _origSubmitFeedback = window.submitFeedbackLocal;
window.submitFeedbackLocal = async function() {
    if (_origSubmitFeedback) await _origSubmitFeedback();
    const d = getKolaData();
    d.feedbackCount = (d.feedbackCount || 0) + 1;
    setKolaData(d);
    checkBadges();
    if (d.feedbackCount === 1) awardBadge('feedback_1');
    else addXP(10, 'Submitted feedback');
};



/* ── UPDATE HEADER WITH XP DISPLAY ── */
function injectXPBadge() {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;
    const d = getKolaData();
    const session = JSON.parse(localStorage.getItem('kolaSession') || '{}');
    if (!session.name) return;
    const pct = Math.round(((d.xp||0) % XP_PER_LEVEL) / XP_PER_LEVEL * 100);
    badge.innerHTML = `👋 ${session.name.split(' ')[0]} &nbsp;<span id="header-xp" style="background:rgba(124,58,237,0.3);color:#a78bfa;border-radius:8px;padding:2px 7px;font-size:9px;font-weight:900;">⚡ Lvl ${d.level||1}</span>`;
}

/* ── BOOT: run streak check on load ── */
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('kolaSession');
    if (session) {
        checkAndUpdateStreak();
        injectXPBadge();
    }
});

/* Boot the XP/streak system when user logs in */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const origBoot = window.bootUser;
        if (origBoot) {
            window.bootUser = function(name) {
                origBoot(name);
                checkAndUpdateStreak();
                injectXPBadge();
            };
        }
    }, 500);
});

