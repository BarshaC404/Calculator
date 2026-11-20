/* ===== Glass Scientific Calculator ===== */
const exprEl = document.getElementById('expr');
const resultEl = document.getElementById('result');
const modeTag = document.getElementById('modeTag');
const memTag = document.getElementById('memTag');
const modeBtn = document.getElementById('modeBtn');
const secondBtn = document.getElementById('secondBtn');
const historyEl = document.getElementById('history');
const historyList = document.getElementById('historyList');

const HISTORY_KEY = 'glassCalc.history.v1';
function storageWorks() {
    try { localStorage.setItem('glassCalc.test', '1'); localStorage.removeItem('glassCalc.test'); return true; }
    catch { return false; }
}
function readSaved() {                       // null = storage unavailable (keep what is in memory)
    if (!storageWorks()) return null;
    try {
        const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch { return []; }
}
const loadHistory = () => readSaved() || [];
function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history)); } catch {}
}

const state = { expr: '', ans: 0, mem: 0, deg: true, second: false, fresh: false, history: loadHistory() };
if (state.history.length) state.ans = state.history[0].value;

/* ---------- tokenizer ---------- */
const FUNCS = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'abs', '√', '∛'];

function tokenize(src) {
    const t = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) { i++; continue; }
        if (/[0-9.]/.test(c)) {
            let j = i;
            while (j < src.length && /[0-9.]/.test(src[j])) j++;
            const s = src.slice(i, j);
            if ((s.match(/\./g) || []).length > 1 || s === '.') throw new Error('Bad number');
            t.push({ type: 'num', value: parseFloat(s) });
            i = j; continue;
        }
        if (src.startsWith('Ans', i)) { t.push({ type: 'num', value: state.ans }); i += 3; continue; }
        const fn = FUNCS.find(f => src.startsWith(f, i));
        if (fn) { t.push({ type: 'fn', value: fn }); i += fn.length; continue; }
        if (c === 'π') { t.push({ type: 'num', value: Math.PI }); i++; continue; }
        if (c === 'e') { t.push({ type: 'num', value: Math.E }); i++; continue; }
        if ('+−-×÷*/^!%()'.includes(c)) { t.push({ type: 'op', value: c }); i++; continue; }
        throw new Error('Unexpected ' + c);
    }
    return t;
}

/* ---------- math helpers ---------- */
const toRad = x => (state.deg ? x * Math.PI / 180 : x);
const fromRad = x => (state.deg ? x * 180 / Math.PI : x);

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial needs a whole number ≥ 0');
    if (n > 170) return Infinity;
    let r = 1;
    for (let k = 2; k <= n; k++) r *= k;
    return r;
}

function trig(fn, x) {
    if (state.deg) {                       // exact values at clean angles
        const m = ((x % 360) + 360) % 360;
        if (fn === 'sin') { if (m === 0 || m === 180) return 0; if (m === 90) return 1; if (m === 270) return -1; }
        if (fn === 'cos') { if (m === 90 || m === 270) return 0; if (m === 0) return 1; if (m === 180) return -1; }
        if (fn === 'tan') {
            if (m === 0 || m === 180) return 0;
            if (m === 90 || m === 270) throw new Error('tan undefined here');
        }
    }
    return Math[fn](toRad(x));
}

function applyFn(name, x) {
    switch (name) {
        case 'sin': case 'cos': case 'tan': return trig(name, x);
        case 'asin': case 'acos':
            if (x < -1 || x > 1) throw new Error('Domain error');
            return fromRad(Math[name](x));
        case 'atan': return fromRad(Math.atan(x));
        case 'ln': if (x <= 0) throw new Error('Domain error'); return Math.log(x);
        case 'log': if (x <= 0) throw new Error('Domain error'); return Math.log10(x);
        case '√': if (x < 0) throw new Error('Invalid input'); return Math.sqrt(x);
        case '∛': return Math.cbrt(x);
        case 'abs': return Math.abs(x);
    }
}

/* ---------- recursive-descent parser ---------- */
function evaluate(src) {
    const tokens = tokenize(src);
    let p = 0;
    const peek = () => tokens[p];
    const isOp = (...v) => peek() && peek().type === 'op' && v.includes(peek().value);

    function parseExpr() {
        let v = parseTerm();
        while (isOp('+', '−', '-')) v = tokens[p++].value === '+' ? v + parseTerm() : v - parseTerm();
        return v;
    }
    function parseTerm() {
        let v = parseUnary();
        for (;;) {
            if (isOp('×', '*')) { p++; v *= parseUnary(); }
            else if (isOp('÷', '/')) {
                p++; const d = parseUnary();
                if (d === 0) throw new Error('Cannot divide by zero');
                v /= d;
            } else if (peek() && (peek().type === 'num' || peek().type === 'fn' || isOp('('))) {
                v *= parseUnary();           // implicit multiplication: 2π, 3(4+1)
            } else return v;
        }
    }
    function parseUnary() {
        if (isOp('−', '-')) { p++; return -parseUnary(); }
        if (isOp('+')) { p++; return parseUnary(); }
        return parsePower();
    }
    function parsePower() {
        const base = parsePostfix();
        if (isOp('^')) { p++; return Math.pow(base, parseUnary()); }
        return base;
    }
    function parsePostfix() {
        let v = parsePrimary();
        while (isOp('!', '%')) v = tokens[p++].value === '!' ? factorial(v) : v / 100;
        return v;
    }
    function parsePrimary() {
        const t = tokens[p++];
        if (!t) throw new Error('Incomplete expression');
        if (t.type === 'num') return t.value;
        if (t.type === 'fn') {
            if (!isOp('(')) throw new Error('Missing (');
            p++;
            const v = parseExpr();
            if (isOp(')')) p++;
            return applyFn(t.value, v);
        }
        if (t.value === '(') {
            const v = parseExpr();
            if (isOp(')')) p++;
            return v;
        }
        throw new Error('Unexpected ' + t.value);
    }

    const out = parseExpr();
    if (p < tokens.length) throw new Error('Unexpected ' + tokens[p].value);
    if (!isFinite(out)) throw new Error('Result too large');
    return out;
}

/* ---------- formatting ---------- */
function format(n) {
    if (Object.is(n, -0)) n = 0;
    const r = parseFloat(n.toPrecision(12));
    const abs = Math.abs(r);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return r.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e', '×10^');
    return r.toLocaleString('en-US', { maximumFractionDigits: 10, useGrouping: false });
}

/* ---------- state + render ---------- */
function autoClose(src) {
    const open = (src.match(/\(/g) || []).length - (src.match(/\)/g) || []).length;
    return src + ')'.repeat(Math.max(0, open));
}

function render() {
    if (!state.fresh) resultEl.classList.remove('done');
    exprEl.textContent = state.expr || '0';
    exprEl.scrollLeft = exprEl.scrollWidth;
    resultEl.classList.remove('error');
    if (!state.expr || state.fresh) { if (!state.fresh) resultEl.textContent = ''; return; }
    try {
        const v = evaluate(autoClose(state.expr));
        resultEl.textContent = /[+−\-×÷^!%(]|sin|cos|tan|ln|log|abs|√|∛|π|Ans|e/.test(state.expr) ? format(v) : '';
    } catch { resultEl.textContent = ''; }
}

function insert(text) {
    const isBinary = '+−×÷^'.includes(text) || text === '%' || text === '!';
    if (state.fresh) {
        // continue from result with an operator, otherwise start fresh
        state.expr = isBinary ? 'Ans' : '';
        resultEl.textContent = '';
    }
    state.fresh = false;
    if (text === '.' ) {                       // avoid duplicate decimals in one number
        const last = state.expr.match(/[0-9.]*$/)[0];
        if (last.includes('.')) return;
    }
    state.expr += text;
    render();
}

function equals() {
    if (!state.expr) return;
    try {
        const closed = autoClose(state.expr);
        const v = evaluate(closed);
        state.history.unshift({ expr: closed, value: v, time: Date.now() });
        state.history = state.history.slice(0, 200);
        saveHistory();
        state.ans = v;
        exprEl.textContent = closed + ' =';
        resultEl.textContent = format(v);
        resultEl.classList.remove('done'); void resultEl.offsetWidth;   // restart the pop animation
        resultEl.classList.add('done');
        burstBalls();
        state.expr = format(v).includes('×10^') ? String(v) : format(v);
        state.fresh = true;
        renderHistory();
    } catch (e) {
        resultEl.textContent = e.message;
        resultEl.classList.remove('done');
        resultEl.classList.add('error');
    }
}

function del() {
    if (state.fresh) { state.expr = ''; state.fresh = false; return render(); }
    const m = state.expr.match(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|ln\(|log\(|abs\(|√\(|∛\(|Ans)$/);
    state.expr = state.expr.slice(0, m ? -m[0].length : -1);
    render();
}

function clearAll() {
    state.expr = ''; state.fresh = false;
    resultEl.textContent = ''; resultEl.classList.remove('error');
    render();
}

function setSecond(on) {
    state.second = on;
    secondBtn.classList.toggle('on', on);
    document.querySelectorAll('[data-alt]').forEach(b => {
        b.textContent = on ? b.dataset.altLabel : b.dataset.label;
    });
}

function runMemory(kind) {
    if (kind === 'mplus') {
        try { state.mem += evaluate(autoClose(state.expr || '0')); memTag.classList.remove('hidden'); } catch {}
    } else {
        insert(format(state.mem));
    }
}

function renderHistory() {
    historyList.innerHTML = '';
    if (!state.history.length) {
        historyList.innerHTML = '<li class="empty">No calculations yet</li>';
        return;
    }
    state.history.forEach(h => {
        const li = document.createElement('li');
        const s = document.createElement('strong');
        s.textContent = format(h.value);
        const t = document.createElement('span');
        t.className = 'time';
        t.textContent = h.time ? new Date(h.time).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        li.append(h.expr, s, t);
        li.addEventListener('click', () => {
            state.expr = format(h.value); state.fresh = false;
            historyEl.classList.add('hidden'); render();
        });
        historyList.appendChild(li);
    });
}

/* ---------- events ---------- */
document.querySelector('.keys').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act) {
        switch (b.dataset.act) {
            case 'ac': clearAll(); break;
            case 'del': del(); break;
            case 'equals': equals(); break;
            case 'second': setSecond(!state.second); break;
            case 'mode':
                state.deg = !state.deg;
                modeTag.textContent = state.deg ? 'DEG' : 'RAD';
                modeBtn.textContent = state.deg ? 'Deg' : 'Rad';
                render(); break;
            case 'mplus': case 'mrecall': runMemory(b.dataset.act); break;
        }
        return;
    }
    const text = state.second && b.dataset.alt ? b.dataset.alt : b.dataset.ins;
    if (text) insert(text);
});

const closeHistory = () => historyEl.classList.add('hidden');
document.getElementById('historyBtn').addEventListener('click', () => { refreshHistory(); historyEl.classList.toggle('hidden'); });
document.getElementById('backBtn').addEventListener('click', closeHistory);
const refreshBtn = document.getElementById('refreshHistory');
const noteEl = document.getElementById('historyNote');
function refreshHistory() {
    const saved = readSaved();
    if (saved) state.history = saved;        // re-read what is saved on this device
    renderHistory();
    historyList.scrollTop = 0;
    const n = state.history.length;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    noteEl.textContent = saved
        ? `Updated ${now} · ${n} saved calculation${n === 1 ? '' : 's'}`
        : `Updated ${now} · ${n} this session (browser storage is blocked, so nothing is saved)`;
    historyList.classList.remove('flash'); void historyList.offsetWidth; historyList.classList.add('flash');
    refreshBtn.textContent = 'Refreshed ✓';
    clearTimeout(refreshHistory.t);
    refreshHistory.t = setTimeout(() => { refreshBtn.textContent = 'Refresh'; }, 1400);
}
refreshBtn.addEventListener('click', refreshHistory);
document.getElementById('clearHistory').addEventListener('click', () => { state.history = []; saveHistory(); renderHistory(); });

document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (!historyEl.classList.contains('hidden')) {   // typing or Esc returns to the calculator
        if (k === 'Escape') { closeHistory(); return; }
        closeHistory();
    }
    const map = { '*': '×', '/': '÷', '-': '−' };
    if (/^[0-9.+()^!%]$/.test(k) || map[k]) { e.preventDefault(); insert(map[k] || k); }
    else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
    else if (k === 'Backspace') del();
    else if (k === 'Escape') clearAll();
    else if (k === 'p') insert('π');
});

renderHistory();
render();


/* ===== Compact / full screen mode ===== */
const MODE_KEY = 'glassCalc.mode.v1';
const calcEl = document.querySelector('.calculator');
const sizeBtn = document.getElementById('sizeBtn');
let enteredFS = false;

function setFull(on, userAction) {
    calcEl.classList.toggle('full', on);
    document.body.classList.toggle('full-mode', on);
    sizeBtn.textContent = on ? 'Compact' : 'Full screen';
    if (userAction) { try { localStorage.setItem(MODE_KEY, on ? 'full' : 'compact'); } catch {} }
    if (!userAction) return;
    if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => { enteredFS = true; }).catch(() => {});
    } else if (!on && document.fullscreenElement) {
        enteredFS = false;
        document.exitFullscreen().catch(() => {});
    }
}
sizeBtn.addEventListener('click', () => setFull(!calcEl.classList.contains('full'), true));
document.addEventListener('fullscreenchange', () => {      // browser Esc / F11 exit
    if (!document.fullscreenElement && enteredFS) { enteredFS = false; setFull(false, false); }
});
let savedMode = null;
try { savedMode = localStorage.getItem(MODE_KEY); } catch {}
// first visit on a phone (or a landscape phone) starts in the layout that fits the screen
if (savedMode === 'full' || (savedMode === null && matchMedia('(max-width: 680px), (max-height: 500px)').matches)) setFull(true, false);

/* ===== Movable glass balls (background) ===== */
const balls = [];
const BALL_TINTS = ['255,236,205', '233,166,90', '201,128,58', '255,214,160', '160,90,40', '255,246,232'];

function makeBalls(count = 9) {
    const layer = document.createElement('div');
    layer.className = 'ball-layer';
    document.body.prepend(layer);

    for (let i = 0; i < count; i++) {
        const size = 56 + Math.random() * 90;
        const el = document.createElement('div');
        el.className = 'ball';
        el.innerHTML = '<i class="drop"></i>';
        el.style.width = el.style.height = size + 'px';
        el.style.setProperty('--tint', BALL_TINTS[i % BALL_TINTS.length]);
        layer.appendChild(el);

        const b = {
            el, size, r: size / 2,
            x: Math.random() * (innerWidth - size),
            y: Math.random() * (innerHeight - size),
            vx: 0,
            baseVy: 0.5 + Math.random() * 1.1,       // each drop slides down at its own pace
            phase: Math.random() * 6.28,
            vy: 0.5 + Math.random() * 1.1,
            drag: false, lx: 0, ly: 0
        };
        balls.push(b);

        el.addEventListener('pointerdown', e => {
            b.drag = true; b.lx = e.clientX; b.ly = e.clientY; b.vx = b.vy = 0;
            el.setPointerCapture(e.pointerId);
            el.classList.add('grabbed');
        });
        el.addEventListener('pointermove', e => {
            if (!b.drag) return;
            const dx = e.clientX - b.lx, dy = e.clientY - b.ly;
            b.x += dx; b.y += dy;
            b.vx = dx; b.vy = dy;            // remembered for the throw
            b.lx = e.clientX; b.ly = e.clientY;
        });
        const release = () => { b.drag = false; el.classList.remove('grabbed'); };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
    }
}

function burstBalls() {                      // every calculation gives the balls a push
    balls.forEach(b => {
        const a = Math.random() * Math.PI * 2, s = 5 + Math.random() * 5;
        b.vx += Math.cos(a) * s; b.vy += Math.sin(a) * s;
    });
}

function animateBalls() {
    const w = innerWidth, h = innerHeight;
    balls.forEach(b => {
        if (!b.drag) {
            b.phase += 0.02;
            b.x += b.vx + Math.sin(b.phase) * 0.35;  // slight sideways wobble
            b.y += b.vy;
            b.vx *= 0.985;                           // throws fade out
            b.vy += (b.baseVy - b.vy) * 0.02;        // and settle back to sliding down
            if (b.y > h) { b.y = -b.size; b.x = Math.random() * (w - b.size); b.vy = b.baseVy; }
        }
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); }
        if (b.y < -b.size) { b.y = -b.size; b.vy = Math.abs(b.vy); }
        if (b.x > w - b.size) { b.x = w - b.size; b.vx = -Math.abs(b.vx); }
                b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
    });
    requestAnimationFrame(animateBalls);
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    makeBalls(innerWidth < 680 ? 7 : 14);
    animateBalls();
}
