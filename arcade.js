/* Shared helpers for the 노을 오락실 cabinets: storage, sound, stage fitting, panels, loop. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
try { if (window.self !== window.top) document.documentElement.classList.add('embedded'); } catch (e) { document.documentElement.classList.add('embedded'); }

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let muted = store.get('arcade-mute', false);
let ac = null, noiseBuf = null;
function initAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
function tone(freq, dur, type, vol, slide) {
  if (!ac || muted) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, lp) {
  if (!ac || muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass';
  f.frequency.setValueAtTime(lp || 1200, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
  g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + dur);
}
function seq(notes, gap, type, vol, dur) {
  notes.forEach((f, i) => setTimeout(() => tone(f, dur || 0.1, type || 'triangle', vol || 0.05), i * gap));
}

function makeStage(W, H) {
  const stage = $('stage'), frame = $('frame'), cv = $('game'), ctx = cv.getContext('2d');
  const view = { W, H, scale: 1, dpr: 1, cv, ctx };
  function fit() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    let h = sh, w = h * W / H;
    if (w > sw) { w = sw; h = w * H / W; }
    frame.style.width = w + 'px'; frame.style.height = h + 'px';
    view.scale = w / W; view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(w * view.dpr)); cv.height = Math.max(1, Math.round(h * view.dpr));
  }
  addEventListener('resize', fit); fit();
  view.begin = () => ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
  view.toLocal = e => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (r.width || 1) * W, y: (e.clientY - r.top) / (r.height || 1) * H };
  };
  return view;
}

function panels() {
  const p = { title: $('titlePanel'), pause: $('pausePanel'), over: $('overPanel') };
  const hud = Array.from(document.querySelectorAll('.hud-btn'));
  return name => {
    for (const k in p) if (p[k]) p[k].hidden = k !== name;
    const inGame = name === null || name === 'pause';
    hud.forEach(b => { b.hidden = !inGame; });
  };
}

function bindMute(btn) {
  const sync = () => { btn.textContent = muted ? '소리 켬' : '소리 끔'; };
  const toggle = () => { muted = !muted; store.set('arcade-mute', muted); sync(); };
  sync();
  btn.addEventListener('click', toggle);
  addEventListener('keydown', e => { if (e.key && e.key.toLowerCase() === 'm' && !e.repeat) toggle(); });
}

function loop(step) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)); last = now;
    step(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => { last = t; frame(t); });
}

const fmt = n => Math.round(n).toLocaleString('ko-KR');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

window.Arcade = { $, store, initAudio, tone, noise, seq, makeStage, panels, bindMute, loop, fmt, clamp, reduceMotion };
})();
