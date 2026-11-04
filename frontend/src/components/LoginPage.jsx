import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import autocratAMark from '../assets/For-Login.png';
import factoryBg from '../assets/factory-bg.jpg';

const LABEL_FONT = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FALLOFF_STEPS = 8;
const SPRING = 320;
const INHERIT = /^(currentcolor|inherit)$/i;
const INTRO_DELAY = 0.15;
const KICK_DECAY = 0.62;

const approach = (current, target, dt, seconds) => current + (target - current) * (1 - Math.exp(-dt / seconds));

const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));

const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const noise = (...values) => {
  let h = 2166136261;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
};

const signed = value => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0');

const MFG_STAGES = [
  { at: 0, short: 'MRP' },
  { at: 20, short: 'BOM' },
  { at: 40, short: 'WORK ORDERS' },
  { at: 60, short: 'CNC' },
  { at: 80, short: 'QC' }
];

const TERMS = [
  'TAKT TIME', 'OEE', 'WIP', 'KANBAN', 'BOM', 'MRP', 'CNC', 'ROUTING',
  'WORK ORDER', 'LOT TRACEABILITY', 'QUALITY CONTROL', 'JIT', 'CYCLE TIME', 'SHOP FLOOR'
];

const TechText = ({
  text = 'React Bits',
  fontFamily = '',
  fontWeight = 600,
  fontSize = 150,
  letterSpacing = -0.05,
  color = 'currentColor',
  accentColor = 'currentColor',
  align = 'center',
  reach = 200,
  softness = 0.7,
  dashLength = 4,
  dashGap = 2,
  strokeWidth = 1.5,
  lineStyle = 'dashed',
  reveal = 'letter',
  specks = 15,
  selection = true,
  labels = true,
  draggable = true,
  bounce = 0.4,
  sweep = true,
  speed = 1,
  clickKick = true,
  intro = 'none',
  introDuration = 2,
  guides = false,
  className = '',
  style
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const settingsRef = useRef(null);
  const wakeRef = useRef(() => { });

  useEffect(() => {
    settingsRef.current = {
      text,
      fontFamily,
      fontWeight,
      fontSize,
      letterSpacing,
      color,
      accentColor,
      align,
      reach,
      softness,
      dashLength,
      dashGap,
      strokeWidth,
      lineStyle,
      reveal,
      specks,
      selection,
      labels,
      draggable,
      bounce,
      sweep,
      speed,
      clickKick,
      intro,
      introDuration,
      guides
    };
    wakeRef.current();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    if (!container || !canvas || !ctx || !scratchCtx) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let visible = false;
    let alive = true;
    let layoutKey = '';
    let requestedFont = '';
    let word = null;
    let glyphs = [];
    let presence = 0;
    let clock = 0;
    let pulse = 0;
    let placed = false;
    let dragging = -1;
    let cursor = '';
    let introClock = 0;
    let introKind = '';
    let introducing = false;
    let fontsReady = !document.fonts;
    let guideAlpha = 0;
    const kicks = [];
    const press = { x: 0, y: 0, time: 0, index: -1 };
    const pointer = { x: 0, y: 0, inside: false };
    const grab = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };
    const frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };

    const refreshFonts = () => {
      layoutKey = '';
      wakeRef.current();
    };

    const fontsLoaded = () => {
      fontsReady = true;
      refreshFonts();
    };

    const family = s => s.fontFamily || getComputedStyle(container).fontFamily || 'sans-serif';
    const fontFor = (s, size) => `${s.fontWeight} ${size}px ${family(s)}`;

    const palette = s => {
      const current = getComputedStyle(container).color || '#000000';
      const pick = value => (!value || INHERIT.test(String(value).trim()) ? current : value);
      return { ink: pick(s.color), accent: pick(s.accentColor) };
    };

    const setFont = (target, s, size) => {
      target.font = fontFor(s, size);
      if ('letterSpacing' in target) target.letterSpacing = `${s.letterSpacing * size}px`;
      target.textAlign = 'left';
      target.textBaseline = 'alphabetic';
    };

    const sprite = (s, view, glyph, stroke, ink) => {
      const pad = Math.ceil(s.strokeWidth * 2 + 4);
      const left = glyph.box.x1 - pad;
      const top = glyph.box.y1 - pad;
      const w = glyph.box.x2 - glyph.box.x1 + pad * 2;
      const h = glyph.box.y2 - glyph.box.y1 + pad * 2;
      const image = document.createElement('canvas');
      image.width = Math.max(1, Math.ceil(w * dpr));
      image.height = Math.max(1, Math.ceil(h * dpr));
      const c = image.getContext('2d');
      if (!c) return { image, left, top };
      c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
      setFont(c, s, view.size);
      if (stroke) {
        c.lineJoin = 'round';
        c.lineWidth = s.strokeWidth * 2;
        c.lineCap = 'butt';
        c.strokeStyle = ink;
        if (s.lineStyle !== 'solid') c.setLineDash([Math.max(1, s.dashLength), Math.max(1, s.dashGap)]);
        c.strokeText(glyph.char, glyph.x, view.baseline);
        c.setLineDash([]);
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000000';
        c.fillText(glyph.char, glyph.x, view.baseline);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.fillStyle = ink;
        c.fillText(glyph.char, glyph.x, view.baseline);
      }
      return { image, left, top };
    };

    const ensureLayout = (s, ink) => {
      const key = [
        s.text,
        family(s),
        s.fontWeight,
        s.fontSize,
        s.letterSpacing,
        s.align,
        ink,
        s.dashLength,
        s.dashGap,
        s.strokeWidth,
        s.lineStyle,
        width,
        height,
        dpr
      ].join('|');
      if (key === layoutKey && word) return word;
      layoutKey = key;
      const wanted = fontFor(s, 64);
      if (document.fonts && wanted !== requestedFont) {
        requestedFont = wanted;
        document.fonts.load(wanted, s.text).then(refreshFonts, refreshFonts);
      }

      const probe = scratchCtx;
      setFont(probe, s, s.fontSize);
      let m = probe.measureText(s.text);
      const fit = Math.min(
        1,
        (width * 0.9) / Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1),
        (height * 0.66) / Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, 1)
      );
      const size = s.fontSize * fit;
      setFont(probe, s, size);
      m = probe.measureText(s.text);
      const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const margin = width * 0.05;
      const start =
        s.align === 'left' ? margin : s.align === 'right' ? width - margin - inkWidth : (width - inkWidth) / 2;
      const x = start + m.actualBoundingBoxLeft;
      const baseline = (height - inkHeight) / 2 + m.actualBoundingBoxAscent;
      const xHeight = baseline - probe.measureText('x').actualBoundingBoxAscent;
      const capHeight = baseline - probe.measureText('H').actualBoundingBoxAscent;
      const ascender = baseline - probe.measureText('d').actualBoundingBoxAscent;
      const descender = baseline + probe.measureText('p').actualBoundingBoxDescent;
      const top = baseline - m.actualBoundingBoxAscent;
      const bottom = baseline + m.actualBoundingBoxDescent;
      const inkTop = Math.min(top, capHeight) - 2;
      const inkBottom = Math.max(bottom, baseline) + 2;
      const next = {
        size,
        baseline,
        left: x - m.actualBoundingBoxLeft,
        right: x + m.actualBoundingBoxRight,
        top,
        bottom,
        lines: [
          { y: baseline, label: 'baseline' },
          { y: xHeight, label: 'x-height' },
          { y: capHeight, label: 'cap height' },
          ...(capHeight - ascender > Math.max(11, size * 0.06) ? [{ y: ascender, label: 'ascender' }] : []),
          { y: descender, label: 'descender' }
        ],
        bands: [
          { y0: xHeight, y1: baseline, up: true, order: 0 },
          { y0: capHeight, y1: xHeight, up: true, order: 1 },
          { y0: inkTop, y1: capHeight, up: true, order: 2 },
          { y0: baseline, y1: inkBottom, up: false, order: 1 }
        ].filter(band => band.y1 - band.y0 > 0.5)
      };
      word = next;

      const chars = Array.from(s.text);
      const previous = glyphs;
      glyphs = [];
      let prefix = '';
      chars.forEach((char, i) => {
        prefix += char;
        const own = probe.measureText(char);
        const gx = x + probe.measureText(prefix).width - own.width;
        if (!char.trim()) return;
        const base = {
          char,
          x: gx,
          box: {
            x1: gx - own.actualBoundingBoxLeft,
            y1: baseline - own.actualBoundingBoxAscent,
            x2: gx + own.actualBoundingBoxRight,
            y2: baseline + own.actualBoundingBoxDescent
          }
        };
        const kept = previous[glyphs.length];
        glyphs.push({
          ...base,
          offset: kept?.char === char ? kept.offset : { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          outline: 0,
          shown: 1,
          cells: null,
          assembled: 0,
          index: i,
          fill: sprite(s, next, base, false, ink),
          dashes: sprite(s, next, base, true, ink)
        });
      });
      dragging = -1;
      frame.index = -1;
      return next;
    };

    const glyphAt = (x, y) => {
      if (!word || y < word.top - 24 || y > word.bottom + 24) return -1;
      let best = -1;
      let bestDistance = Infinity;
      glyphs.forEach((glyph, i) => {
        const x1 = glyph.box.x1 + glyph.offset.x;
        const x2 = glyph.box.x2 + glyph.offset.x;
        const d = x < x1 ? x1 - x : x > x2 ? x - x2 : 0;
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      return bestDistance < 28 ? best : -1;
    };

    const falloff = (target, cx, cy, radius, strength, softness) => {
      const inner = Math.min(1, Math.max(0, 1 - softness));
      const gradient = target.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      if (inner > 0.995) {
        gradient.addColorStop(0.995, `rgba(0, 0, 0, ${strength})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        return gradient;
      }
      for (let i = 0; i <= FALLOFF_STEPS; i++) {
        const t = i / FALLOFF_STEPS;
        const eased = t * t * (3 - 2 * t);
        gradient.addColorStop(inner + (1 - inner) * t, `rgba(0, 0, 0, ${strength * (1 - eased)})`);
      }
      return gradient;
    };

    const blit = (target, art, dx, dy, originX, originY) => {
      target.drawImage(
        art.image,
        Math.round((art.left + dx) * dpr - originX),
        Math.round((art.top + dy) * dpr - originY)
      );
    };

    const drawReveal = s => {
      const radius = s.reach * dpr;
      const cx = lens.x * dpr;
      const cy = lens.y * dpr;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = falloff(ctx, cx, cy, radius, presence, s.softness);
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.globalCompositeOperation = 'source-over';

      const x0 = Math.max(0, Math.floor(cx - radius));
      const y0 = Math.max(0, Math.floor(cy - radius));
      const x1 = Math.min(canvas.width, Math.ceil(cx + radius));
      const y1 = Math.min(canvas.height, Math.ceil(cy + radius));
      if (x1 <= x0 || y1 <= y0) return;
      const w = x1 - x0;
      const h = y1 - y0;
      if (scratch.width < w || scratch.height < h) {
        scratch.width = Math.max(scratch.width, w);
        scratch.height = Math.max(scratch.height, h);
      }
      scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
      scratchCtx.globalCompositeOperation = 'source-over';
      scratchCtx.clearRect(0, 0, w, h);
      for (const glyph of glyphs) blit(scratchCtx, glyph.dashes, glyph.offset.x, glyph.offset.y, x0, y0);
      scratchCtx.globalCompositeOperation = 'destination-in';
      scratchCtx.fillStyle = falloff(scratchCtx, cx - x0, cy - y0, radius, 1, s.softness);
      scratchCtx.fillRect(0, 0, w, h);
      scratchCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = presence;
      ctx.drawImage(scratch, 0, 0, w, h, x0, y0, w, h);
      ctx.globalAlpha = 1;
    };

    const crisp = value => (Math.round(value * dpr) + 0.5) / dpr;

    const perimeterPoint = (distance, w, h) => {
      let d = ((distance % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
      if (d < w) return [frame.x1 + d, frame.y1, 0, -1];
      d -= w;
      if (d < h) return [frame.x2, frame.y1 + d, 1, 0];
      d -= h;
      if (d < w) return [frame.x2 - d, frame.y2, 0, 1];
      d -= w;
      return [frame.x1, frame.y2 - d, -1, 0];
    };

    const drawSpecks = (s, a, accent) => {
      const w = frame.x2 - frame.x1;
      const h = frame.y2 - frame.y1;
      if (w < 2 || h < 2) return;
      const perimeter = 2 * (w + h);
      const seed = frame.index + 1;
      const grid = 3;
      ctx.fillStyle = accent;
      ctx.strokeStyle = accent;

      for (let k = 0; k < s.specks; k++) {
        const period = 0.5 + noise(seed, k, 11) * 1.2;
        const t = pulse / period + noise(seed, k, 17);
        const cycle = Math.floor(t);
        const life = t - cycle;
        if (life > 0.7) continue;
        const [px, py, nx, ny] = perimeterPoint(noise(seed, k, cycle) * perimeter, w, h);
        const pick = noise(seed, k, cycle, 2);
        const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11;
        const large = size >= 8;
        const out = (large ? 9 : 4) + Math.floor(noise(seed, k, cycle, 1) * 5) * grid;
        const x = frame.x1 + Math.round((px + nx * out - frame.x1) / grid) * grid;
        const y = frame.y1 + Math.round((py + ny * out - frame.y1) / grid) * grid;
        const tone = noise(seed, k, cycle, 3);
        const blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
        const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink;
        const left = Math.round(x - size / 2);
        const top = Math.round(y - size / 2);
        ctx.globalAlpha = alpha;
        if (tone < 0.26 || (large && tone < 0.78)) {
          ctx.strokeRect(left + 0.5, top + 0.5, size, size);
          if (large && tone > 0.5) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
        } else {
          ctx.fillRect(left, top, size, size);
        }
      }

      for (let j = 0; j < 2; j++) {
        const head = (pulse * 0.42 * s.speed + j * 0.5) * perimeter;
        for (let i = 0; i < 4; i++) {
          const [x, y] = perimeterPoint(head - i * 6, w, h);
          const size = i === 0 ? 3 : 2;
          ctx.globalAlpha = a * [0.95, 0.55, 0.32, 0.16][i];
          ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawFrame = (s, accent) => {
      const glyph = glyphs[frame.index];
      if (!glyph || frame.alpha < 0.01) return;
      const a = frame.alpha;
      const x1 = crisp(frame.x1);
      const y1 = crisp(frame.y1);
      const x2 = crisp(frame.x2);
      const y2 = crisp(frame.y2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = accent;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;

      const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
      if (moved > 1) {
        const hx = (glyph.box.x1 + glyph.box.x2) / 2;
        const hy = (glyph.box.y1 + glyph.box.y2) / 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + glyph.offset.x, hy + glyph.offset.y);
        ctx.setLineDash([3, 4]);
        ctx.globalAlpha = 0.45 * a;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4);
        ctx.globalAlpha = 0.7 * a;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.globalAlpha = 0.5 * a;
      ctx.stroke();

      ctx.beginPath();
      for (const [cx, cy] of [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2]
      ]) {
        ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
      }
      ctx.globalAlpha = 0.95 * a;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (s.specks > 0) drawSpecks(s, a, accent);

      if (!s.labels) return;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.62 * a;
      const label =
        moved > 1
          ? `${signed(Math.round(glyph.offset.x))}, ${signed(Math.round(-glyph.offset.y))}`
          : `${glyph.char}  ${Math.round(glyph.box.x2 - glyph.box.x1)} × ${Math.round(glyph.box.y2 - glyph.box.y1)}`;
      ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 7);
      ctx.globalAlpha = 1;
    };

    const drawLines = (s, view, accent, alpha, growth) => {
      const pad = Math.max(12, view.size * 0.12);
      const x1 = Math.round(view.left - pad);
      const x2 = Math.round(view.right + pad);
      const room = width - x2 > x1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = 1;
      ctx.font = LABEL_FONT;
      ctx.textBaseline = 'middle';
      ctx.textAlign = room ? 'left' : 'right';
      view.lines.forEach((line, k) => {
        const grow = growth(k);
        if (grow <= 0.001) return;
        const y = crisp(line.y);
        const end = x1 + (x2 - x1) * grow;
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(end, y);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillRect(x1 - 1, Math.round(line.y) - 1, 3, 3);
        ctx.fillRect(Math.round(end) - 1, Math.round(line.y) - 1, 3, 3);
        if (s.labels) {
          ctx.globalAlpha = alpha * 0.62 * smoothstep(0.7, 1, grow);
          ctx.fillText(line.label, room ? x2 + 8 : x1 - 8, Math.round(line.y));
        }
      });
      ctx.textAlign = 'left';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    };

    const ensureCells = (glyph, view) => {
      if (glyph.cells) return glyph.cells;
      const art = glyph.fill;
      const size = Math.max(3, Math.round(view.size / 26));
      const w = art.image.width;
      const h = art.image.height;
      const source = art.image.getContext('2d');
      const cells = [];
      glyph.cells = cells;
      glyph.assembled = 0;
      if (!source || w < 2 || h < 2) return cells;
      const data = source.getImageData(0, 0, w, h).data;
      const gx = Math.floor(art.left / size) * size;
      const gy = Math.floor(art.top / size) * size;
      const cols = Math.ceil((art.left + w / dpr - gx) / size) + 1;
      const rows = Math.ceil((art.top + h / dpr - gy) / size) + 1;
      const hit = new Uint8Array(cols * rows);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          if (data[(py * w + px) * 4 + 3] < 24) continue;
          const cx = Math.floor((art.left + px / dpr - gx) / size);
          const cy = Math.floor((art.top + py / dpr - gy) / size);
          hit[cy * cols + cx] = 1;
        }
      }
      const center = (glyph.box.x1 + glyph.box.x2) / 2;
      const along = clamp01((center - view.left) / Math.max(1, view.right - view.left));
      for (let k = 0; k < hit.length; k++) {
        if (!hit[k]) continue;
        const angle = noise(glyph.index, k, 1) * Math.PI * 2;
        const distance = view.size * (0.25 + 0.6 * noise(glyph.index, k, 2));
        const start = 0.03 + 0.36 * along + 0.12 * noise(glyph.index, k, 3);
        const land = start + 0.3 + 0.14 * noise(glyph.index, k, 4);
        cells.push({
          x: gx + (k % cols) * size,
          y: gy + Math.floor(k / cols) * size,
          size,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance * 0.7,
          start,
          land
        });
        glyph.assembled = Math.max(glyph.assembled, land);
      }
      return cells;
    };

    const cellRect = (x, y, size) => {
      const left = Math.round(x * dpr);
      const top = Math.round(y * dpr);
      return [left, top, Math.round((x + size) * dpr) - left, Math.round((y + size) * dpr) - top];
    };

    const drawAssembling = (glyph, progress, accent) => {
      const cells = glyph.cells || [];
      ctx.save();
      ctx.beginPath();
      let landed = 0;
      for (const cell of cells) {
        if (progress < cell.land) continue;
        const [x, y, w, h] = cellRect(cell.x, cell.y, cell.size);
        ctx.rect(x, y, w, h);
        landed++;
      }
      if (landed) {
        ctx.clip();
        blit(ctx, glyph.fill, 0, 0, 0, 0);
      }
      ctx.restore();
      ctx.fillStyle = accent;
      for (const cell of cells) {
        if (progress < cell.start || progress >= cell.land) continue;
        const u = (progress - cell.start) / (cell.land - cell.start);
        const eased = 1 - Math.pow(1 - u, 4);
        const size = cell.size * (0.4 + 0.6 * eased);
        const x = cell.x + (cell.size - size) / 2 + cell.dx * (1 - eased);
        const y = cell.y + (cell.size - size) / 2 + cell.dy * (1 - eased);
        const [left, top, w, h] = cellRect(x, y, size);
        ctx.globalAlpha = Math.min(1, u * 4) * (0.55 + 0.45 * eased);
        ctx.fillRect(left, top, Math.max(1, w), Math.max(1, h));
      }
      ctx.globalAlpha = 1;
    };

    const drawFilling = (glyph, lead, progress, view) => {
      const art = glyph.fill;
      const left = Math.floor(art.left * dpr);
      const top = Math.floor(art.top * dpr);
      const w = art.image.width + 2;
      const h = art.image.height + 2;
      const fill = clamp01((progress - 0.24 - 0.28 * lead) / 0.48);
      const rects = [];
      for (const band of view.bands) {
        const amount = smoothstep(0.3 * band.order, 0.3 * band.order + 0.4, fill);
        if (amount <= 0) continue;
        const span = (band.y1 - band.y0) * amount;
        const y0 = Math.round((band.up ? band.y1 - span : band.y0) * dpr);
        const y1 = Math.round((band.up ? band.y1 : band.y0 + span) * dpr);
        if (y1 > y0) rects.push([y0, y1 - y0]);
      }
      const outline = smoothstep(0.08 + 0.2 * lead, 0.22 + 0.2 * lead, progress);
      if (outline > 0.001) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(left - 2, top - 2, w + 2, h + 2);
        for (const [y, span] of rects) ctx.rect(left - 2, y, w + 2, span);
        ctx.clip('evenodd');
        ctx.globalAlpha = outline;
        blit(ctx, glyph.dashes, 0, 0, 0, 0);
        ctx.restore();
      }
      if (rects.length) {
        ctx.save();
        ctx.beginPath();
        for (const [y, span] of rects) ctx.rect(left - 2, y, w + 2, span);
        ctx.clip();
        blit(ctx, glyph.fill, 0, 0, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    const kick = index => {
      const strength = (word ? word.size : 120) * 11;
      kicks.push({ index, at: pulse, velocity: strength });
      for (let d = 1; d < glyphs.length; d++) {
        const velocity = strength * Math.pow(KICK_DECAY, d);
        if (velocity < 30) break;
        for (const j of [index - d, index + d]) {
          if (j >= 0 && j < glyphs.length) kicks.push({ index: j, at: pulse + d * 0.055, velocity });
        }
      }
      wakeRef.current();
    };

    const tick = now => {
      raf = 0;
      const s = settingsRef.current;
      if (!s) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const { ink, accent } = palette(s);
      const view = ensureLayout(s, ink);
      const damping = 2 * Math.sqrt(SPRING) * (1 - clamp01(s.bounce) * 0.96);

      if (s.intro !== introKind) {
        introKind = s.intro;
        introClock = 0;
      }
      const introOn = introKind !== 'none' && !reducedMotion && glyphs.length > 0;
      if (introOn && fontsReady) introClock += dt;
      const progress = introOn ? clamp01((introClock - INTRO_DELAY) / Math.max(0.3, s.introDuration)) : 1;
      introducing = introOn && progress < 1;

      const sweeping = !introducing && s.sweep && !reducedMotion && !pointer.inside && dragging < 0;
      if (sweeping) clock += dt * s.speed;
      pulse += dt;
      let targetX = pointer.x;
      let targetY = pointer.y;
      if (sweeping) {
        targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45));
        targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8));
      }
      const active = !introducing && (pointer.inside || sweeping || dragging >= 0);
      if (active && !placed) {
        lens.x = targetX;
        lens.y = targetY;
      }
      if (active) {
        const lag = pointer.inside ? 0.05 : 0.22;
        lens.x = approach(lens.x, targetX, dt, lag);
        lens.y = approach(lens.y, targetY, dt, lag);
      }
      placed = active;
      presence = approach(presence, s.reveal === 'area' && active && dragging < 0 ? 1 : 0, dt, 0.16);

      for (let k = kicks.length - 1; k >= 0; k--) {
        if (kicks[k].at > pulse) continue;
        const glyph = glyphs[kicks[k].index];
        if (glyph) glyph.velocity.y -= kicks[k].velocity;
        kicks.splice(k, 1);
      }

      let moving = false;
      glyphs.forEach((glyph, i) => {
        if (i === dragging) {
          glyph.offset.x = approach(glyph.offset.x, pointer.x - grab.x, dt, 0.03);
          glyph.offset.y = approach(glyph.offset.y, pointer.y - grab.y, dt, 0.03);
          glyph.velocity.x = 0;
          glyph.velocity.y = 0;
          moving = true;
          return;
        }
        const { offset, velocity } = glyph;
        if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) {
          offset.x = 0;
          offset.y = 0;
          velocity.x = 0;
          velocity.y = 0;
          return;
        }
        velocity.x += (-SPRING * offset.x - damping * velocity.x) * dt;
        velocity.y += (-SPRING * offset.y - damping * velocity.y) * dt;
        offset.x += velocity.x * dt;
        offset.y += velocity.y * dt;
        moving = true;
      });

      let typing = -1;
      if (introducing && introKind === 'type') {
        const step = 0.86 / glyphs.length;
        const cursorAt = Math.min(glyphs.length - 1, Math.floor(progress / step));
        typing = progress < 0.93 ? cursorAt : -1;
        glyphs.forEach((glyph, i) => {
          glyph.shown = i < cursorAt ? 1 : i === cursorAt ? smoothstep(0, step * 0.3, progress - i * step) : 0;
        });
      } else {
        glyphs.forEach(glyph => {
          glyph.shown = 1;
        });
      }

      const focus = introducing ? typing : dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
      if (focus >= 0 && s.selection) {
        const glyph = glyphs[focus];
        const bx1 = glyph.box.x1 + glyph.offset.x - 6;
        const by1 = glyph.box.y1 + glyph.offset.y - 6;
        const bx2 = glyph.box.x2 + glyph.offset.x + 6;
        const by2 = glyph.box.y2 + glyph.offset.y + 6;
        if (frame.index < 0 || frame.alpha < 0.02) {
          frame.x1 = bx1;
          frame.y1 = by1;
          frame.x2 = bx2;
          frame.y2 = by2;
        }
        const glide = focus === dragging ? 0.02 : 0.08;
        frame.x1 = approach(frame.x1, bx1, dt, glide);
        frame.y1 = approach(frame.y1, by1, dt, glide);
        frame.x2 = approach(frame.x2, bx2, dt, glide);
        frame.y2 = approach(frame.y2, by2, dt, glide);
        frame.index = focus;
      }
      frame.alpha = approach(frame.alpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);

      glyphs.forEach((glyph, i) => {
        const target = introducing
          ? introKind === 'type' && (i === typing || (typing >= 0 && i > typing))
            ? 1
            : 0
          : s.reveal === 'letter' && i === focus && i !== dragging
            ? 1
            : 0;
        if (introducing && glyph.shown === 0) glyph.outline = target;
        glyph.outline = approach(glyph.outline, target, dt, 0.09);
        if (Math.abs(glyph.outline - target) > 0.002) moving = true;
        else glyph.outline = target;
      });

      guideAlpha = approach(guideAlpha, s.guides && !introducing && (focus >= 0 || presence > 0.4) ? 1 : 0, dt, 0.14);

      const hovering = !introducing && focus >= 0 && pointer.inside;
      const nextCursor =
        dragging >= 0 ? 'grabbing' : hovering && s.draggable ? 'grab' : hovering && s.clickKick ? 'pointer' : '';
      if (nextCursor !== cursor) {
        cursor = nextCursor;
        container.style.cursor = nextCursor;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const glyph of glyphs) {
        const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
        if (moved > 1) {
          ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
          blit(ctx, glyph.dashes, 0, 0, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
      if (introducing && introKind === 'metrics') {
        drawLines(s, view, accent, 1 - smoothstep(0.84, 1, progress), k =>
          smoothstep(0.02 + 0.04 * k, 0.2 + 0.04 * k, progress)
        );
      } else if (guideAlpha > 0.005) {
        drawLines(s, view, accent, guideAlpha * 0.6, () => 1);
      }
      glyphs.forEach((glyph, i) => {
        if (introducing && introKind === 'assemble') {
          ensureCells(glyph, view);
          if (progress < glyph.assembled) {
            drawAssembling(glyph, progress, accent);
            return;
          }
        }
        if (introducing && introKind === 'metrics') {
          const lead = glyphs.length > 1 ? i / (glyphs.length - 1) : 0;
          if (progress < 0.72 + 0.28 * lead) {
            drawFilling(glyph, lead, progress, view);
            return;
          }
        }
        if (glyph.shown < 0.001) return;
        if (glyph.outline < 0.999) {
          ctx.globalAlpha = (1 - glyph.outline) * glyph.shown;
          blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        if (glyph.outline > 0.001) {
          ctx.globalAlpha = glyph.outline * glyph.shown;
          blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        ctx.globalAlpha = 1;
      });
      if (presence > 0.001) drawReveal(s);
      drawFrame(s, accent);

      const settling =
        moving ||
        introducing ||
        kicks.length > 0 ||
        (guideAlpha > 0.005 && guideAlpha < 0.995) ||
        Math.abs(presence - (s.reveal === 'area' && active && dragging < 0 ? 1 : 0)) > 0.002 ||
        (frame.alpha > 0.01 && frame.alpha < 0.99);
      if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !visible || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    const resize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      layoutKey = '';
      wake();
    };

    const locate = e => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onMove = e => {
      locate(e);
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      if (dragging >= 0) return;
      pointer.inside = false;
      wake();
    };
    const onDown = e => {
      locate(e);
      pointer.inside = true;
      const s = settingsRef.current;
      const primary = e.pointerType !== 'mouse' || e.button === 0;
      const index = introducing || !primary ? -1 : glyphAt(pointer.x, pointer.y);
      press.x = pointer.x;
      press.y = pointer.y;
      press.time = performance.now();
      press.index = index;
      if (s?.draggable && index >= 0) {
        dragging = index;
        grab.x = pointer.x - glyphs[index].offset.x;
        grab.y = pointer.y - glyphs[index].offset.y;
        container.setPointerCapture?.(e.pointerId);
      }
      wake();
    };
    const onUp = e => {
      if (dragging >= 0) {
        dragging = -1;
        container.releasePointerCapture?.(e.pointerId);
        const rect = container.getBoundingClientRect();
        pointer.inside =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      }
      if (
        e.type === 'pointerup' &&
        press.index >= 0 &&
        settingsRef.current?.clickKick &&
        !reducedMotion &&
        performance.now() - press.time < 450
      ) {
        const rect = container.getBoundingClientRect();
        if (Math.hypot(e.clientX - rect.left - press.x, e.clientY - rect.top - press.y) < 6) kick(press.index);
      }
      press.index = -1;
      wake();
    };

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerenter', onMove, { passive: true });
    container.addEventListener('pointerdown', onDown, { passive: true });
    container.addEventListener('pointerup', onUp, { passive: true });
    container.addEventListener('pointercancel', onUp, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    intersectionObserver.observe(container);
    const themeObserver = new MutationObserver(wake);
    for (const node of [document.documentElement, document.body]) {
      if (node) themeObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    }
    const schemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    schemeQuery?.addEventListener?.('change', wake);
    if (document.fonts) document.fonts.ready.then(fontsLoaded, fontsLoaded);

    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wakeRef.current = () => { };
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      schemeQuery?.removeEventListener?.('change', wake);
      container.style.cursor = '';
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerenter', onMove);
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onUp);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full touch-pan-y select-none ${className}`.trim()}
      style={style}
      role="img"
      aria-label={text}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};


export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [loadingMessage, setLoadingMessage] = useState(
    'Initializing production planning'
  );

  const [loadingProgress, setLoadingProgress] = useState(0);

  const handleContinue = () => {
    const enteredUsername = username.trim();
    if (
      enteredUsername === 'admin@autocrat.in' &&
      password === 'password'
    ) {
      setLoginError('');
      setIsLoading(true);
      setLoadingMessage(
        'Initializing production planning'
      );
      setLoadingProgress(0);
      const progressStart = performance.now();
      const progressDuration = 2000;
      let animationFrameId;

      const updateProductionProgress = (now) => {
        const elapsed = now - progressStart;
        const progress = Math.min(
          100,
          Math.round((elapsed / progressDuration) * 100)
        );
        setLoadingProgress(progress);
        if (progress < 100) {
          animationFrameId = requestAnimationFrame(
            updateProductionProgress
          );
        }
      };

      animationFrameId = requestAnimationFrame(
        updateProductionProgress
      );
      setTimeout(() => {
        setLoadingMessage(
          'Validating production orders'
        );
      }, 400);
      setTimeout(() => {
        setLoadingMessage(
          'Synchronizing manufacturing data'
        );
      }, 800);
      setTimeout(() => {
        setLoadingMessage(
          'Preparing work orders'
        );
      }, 1200);
      setTimeout(() => {
        setLoadingMessage(
          'Finalizing production schedule'
        );
      }, 1600);

      setTimeout(() => {
        setLoadingProgress(100);
        setLoadingMessage(
          'Production environment ready'
        );
        cancelAnimationFrame(animationFrameId);
      }, progressDuration);
      setTimeout(() => {
        onLogin();
      }, 2000);
      return;
    }
    setLoginError(
      'Invalid username or password.'
    );
  };
  return (
    <div
      className="login-shell"
      id="autocrat-login-page"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        :root {
          --btn-accent: #059669;
          --btn-accent-hover: #047857;
          --error-color: #b91c1c;
          --glass-bg: #f8fafc;
          --glass-bg-strong: #f1f5f9;
          --glass-border: #94a3b8;
          --glass-text: #111827;
          --glass-text-soft: rgba(31, 41, 55, 0.78);
          --glass-placeholder: #64748b;
          --form-font-size: 14px;
          --form-text-color: #1f2937;
        }
        * { box-sizing: border-box; }

        .login-shell {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background-image: url(${factoryBg});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          height: 100vh;
          width: 100vw;
          padding: 0;
          margin: 0;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          position: relative;
          animation: loginFadeIn 1.5s ease-in-out;
        }

        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1;
        }

        /* ============================================================
           LOGIN LAYOUT
           ============================================================ */

        .login-card {
          position: relative;
          z-index: 2;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 80px;
        }

        @media (max-width: 860px) {
          .login-card { justify-content: center; padding: 20px; }
          .scene-panel { display: none; }
        }

        /* ============================================================
           LEFT BRAND
           ============================================================ */

        .panel-brand-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          max-width: 580px;
          margin-top: -315px;
        }

        .autocrat-animated-word {
          display: block;
          width: min(560px, 90vw);
          height: 62px;
          max-width: 100%;
          position: relative;
        }

        .autocrat-tech-text { width: 100%; height: 300%; }

        .hero-title {
          color: #ffffff;
          font-size: 48px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.04em;
          margin: 0;
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
          opacity: 0;
          animation: slideInFromLeft 0.8s ease-out forwards;
          animation-delay: 0.2s;
        }

        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .hero-caption {
          color: rgba(255,255,255,0.85);
          font-size: 18px;
          font-weight: 500;
          line-height: 1.6;
          margin-top: 16px;
          margin-bottom: 0;
          max-width: 480px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          opacity: 0;
          animation: slideInFromLeft 0.8s ease-out forwards;
          animation-delay: 0.4s;
        }

        /* ============================================================
           BRAND STATISTICS
           ============================================================ */

        .brand-grid-horizontal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 28px;
          width: 100%;
          max-width: 560px;
        }

        .grid-item {
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.34);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .grid-value {
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          transform: scale(0.9);
          animation: gridFade 0.5s ease-out forwards;
        }

        .grid-label {
          color: rgba(255,255,255,0.92);
          font-size: 11px;
          font-weight: 500;
          margin-top: 3px;
          white-space: nowrap;
          opacity: 0;
          transform: scale(0.9);
          animation: gridFade 0.5s ease-out forwards;
        }

        @keyframes gridFade {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        /* ============================================================
           LOGIN FORM  —  WHITE CARD WITH HIGH-CONTRAST CONTROLS
           ============================================================ */

        .form-panel-container {
          width: 100%;
          max-width: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-card {
          position: relative;
          width: 100%;
          overflow: hidden;
          isolation: isolate;
          background: #ffffff;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border-radius: 24px;
          padding: 44px 40px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          opacity: 0;
          animation: loginFadeIn 1s ease-out forwards;
          animation-delay: 0.2s;
        }

        /* soft light streak across the glass */
        .form-card::before {
          display: none;
          content: '';
          position: absolute;
          top: -40%;
          left: -30%;
          width: 70%;
          height: 120%;
          background: linear-gradient(
            115deg,
            rgba(255,255,255,0.18),
            rgba(255,255,255,0) 60%
          );
          transform: rotate(8deg);
          pointer-events: none;
          z-index: -1;
        }

        /* emerald glow at the bottom edge */
        .form-card::after {
          display: none;
          content: '';
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: -60px;
          height: 120px;
          background: radial-gradient(
            ellipse at center,
            rgba(16,185,129,0.35),
            rgba(16,185,129,0) 70%
          );
          filter: blur(20px);
          pointer-events: none;
          z-index: -1;
        }

        .form-top {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 28px;
        }

        /* logo sits on a white chip with a subtle edge against the white card */
        .brand-logo-a {
          width: 210px;
          height: auto;
          object-fit: contain;
          padding: 8px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        }

        .form-header {
          margin-bottom: 30px;
          text-align: left;
        }

        .form-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--glass-text);
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
          text-shadow: none;
          opacity: 0;
          animation: slideInFromLeft 0.6s ease-out forwards;
          animation-delay: 0.4s;
        }

        .form-sub {
          font-size: var(--form-font-size);
          color: var(--form-text-color);
          margin: 0;
          line-height: 1.5;
          font-weight: 400;
          opacity: 0;
          animation: slideInFromLeft 0.6s ease-out forwards;
          animation-delay: 0.6s;
        }

        .field-group { margin-bottom: 18px; }

        .field-label {
          display: block;
          font-size: var(--form-font-size);
          font-weight: 600;
          color: var(--form-text-color);
          margin-bottom: 8px;
          letter-spacing: 0.01em;
        }

        .id-input {
          width: 100%;
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 0 16px;
          font-size: var(--form-font-size);
          height: 48px;
          position: relative;
          z-index: 1;
          color: var(--form-text-color);
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.12);
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .email-input-wrap,
        .password-input-wrap { position: relative; }

        .email-input-icon,
        .password-input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          width: 18px;
          height: 18px;
          color: #1f2937;
          stroke: currentColor;
          stroke-width: 2;
          fill: none;
          opacity: 1;
          visibility: visible;
          z-index: 2;
          pointer-events: none;
          transform: translateY(-50%);
        }

        .email-input { padding-left: 48px; }

        .password-input {
          padding-left: 48px;
          padding-right: 48px;
        }

        .id-input::placeholder {
          color: var(--glass-placeholder);
          opacity: 1;
        }

        .password-visibility-button {
          position: absolute;
          right: 13px;
          top: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          border: 0;
          color: #1f2937;
          background: transparent;
          z-index: 2;
          cursor: pointer;
          transform: translateY(-50%);
          transition: color 0.2s ease;
        }

        .password-visibility-button:hover { color: #047857; }

        .id-input:hover {
          background: var(--glass-bg-strong);
        }

        .id-input:focus {
          outline: none;
          border-color: #047857;
          background: var(--glass-bg-strong);
          box-shadow:
            0 0 0 3px rgba(16,185,129,0.28),
            inset 0 1px 2px rgba(0,0,0,0.1);
        }

        .id-input:disabled {
          opacity: 1;
          color: #475569;
          background: #e2e8f0;
        }

        /* keep browser autofill from turning inputs white */
        .id-input:-webkit-autofill,
        .id-input:-webkit-autofill:hover,
        .id-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #1f2937;
          caret-color: #1f2937;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: inset 0 0 0 1000px #f8fafc;
        }

        .id-input.input-error {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(248,113,113,0.22);
        }

        .error-text {
          color: var(--error-color);
          font-size: var(--form-font-size);
          font-weight: 600;
          margin-top: 6px;
          text-shadow: none;
        }

        .remember-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .remember-row input[type="checkbox"] {
          accent-color: #047857;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .remember-row label {
          font-size: var(--form-font-size);
          color: var(--form-text-color);
          font-weight: 500;
          cursor: pointer;
        }

        /* ============================================================
           LOGIN BUTTON
           ============================================================ */

        .btn-continue {
          width: 100%;
          height: 50px;
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #047857,
            #065f46
          );
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #ffffff;
          font-family: inherit;
          font-weight: 700;
          font-size: var(--form-font-size);
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow:
            0 8px 22px rgba(5,150,105,0.4),
            inset 0 1px 0 rgba(255,255,255,0.35);
        }

        .btn-continue:hover {
          background: linear-gradient(
            135deg,
            #065f46,
            #064e3b
          );
          transform: translateY(-1px);
          box-shadow:
            0 12px 28px rgba(5,150,105,0.5),
            inset 0 1px 0 rgba(255,255,255,0.4);
        }

        .btn-continue:disabled {
          cursor: not-allowed;
          opacity: 1;
          background: #475569;
          border-color: #475569;
          color: #ffffff;
          transform: none;
        }

        /* ============================================================
           CINEMATIC LOADING SCREEN (ORIGINAL)
           ============================================================ */

        .cinematic-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #000000;
          color: #ffffff;
          animation: cinematicEnter 0.7s cubic-bezier(.22,.61,.36,1) forwards;}

        .loading-stage {
          position: relative;
          width: min(1100px, 90vw);
          height: min(1000px, 80vh);
          overflow: hidden;
          background: #000000;
          border: none;
          border-radius: 0;
          box-shadow: none;}

        @keyframes cinematicEnter {
          from { opacity: 0; transform: scale(1.08); }
          to { opacity: 1; transform: scale(1); }}

        .loader-content {
          position: absolute;
          top: 4%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 30;
          text-align: center;
          width: 100%;}

        .loader-title {
          font-size: 70px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          color: #ffffff;
          text-shadow: 0 3px 18px rgba(255,255,255,0.12);}

        .loader-message {
          margin-top: 10px;
          min-height: 22px;
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          font-weight: 500;
          letter-spacing: 0.02em;
          animation: loaderMessage 0.45s ease-out;
        }

        @keyframes loaderMessage {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .production-progress {
          position: absolute;
          left: 50%;
          top: calc(50% - 132px);
          transform: translateX(-50%);
          width: min(900px, 82%);
          z-index: 35;
          pointer-events: none;
        }

        .production-progress-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
          padding: 0 1px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.58);
          text-transform: uppercase;
        }

        .production-progress-track {
          position: relative;
          width: 100%;
          height: 3px;
          overflow: visible;
          border-radius: 999px;
          background: rgba(255,255,255,0.26);
          box-shadow: 0 0 18px rgba(255,255,255,0.08);
        }

        .production-progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(to right, #10b981, #34d399);
          box-shadow:
            0 0 12px rgba(16,185,129,0.7),
            0 0 24px rgba(16,185,129,0.25);
          transition: width 80ms linear;
        }

        .production-progress-marker {
          position: absolute;
          top: 50%;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 12px rgba(16,185,129,0.8);
          transform: translate(-50%, -50%);
          transition: left 80ms linear;
        }

        .production-progress-status {
          margin-top: 14px;
          min-height: 20px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.88);
          text-shadow: 0 2px 14px rgba(255,255,255,0.08);
          animation: loaderMessage 0.45s ease-out;
        }

        .production-progress-percentage {
          margin-top: 4px;
          text-align: center;
          font-size: 20px;
          line-height: 1;
          font-weight: 800;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 14px rgba(255,255,255,0.12);
        }

        .airport-ground {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #000000;
          overflow: hidden;
        }

        .runway {
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 150px;
          transform: translateY(-50%);
          background: linear-gradient(
            to bottom,
            #050505 0%,
            #111111 48%,
            #111111 52%,
            #050505 100%
          );
          border-top: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 -12px 35px rgba(255,255,255,0.025),
            0 12px 35px rgba(255,255,255,0.025);
        }

        .runway-line {
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 2px;
          transform: translateY(-50%);
          background: repeating-linear-gradient(
            to right,
            rgba(255,255,255,0.72) 0 44px,
            transparent 44px 88px
          );
          opacity: 0.65;
        }

        .cargo-animation {
          position: absolute;
          left: -280px;
          top: 50%;
          width: 250px;
          height: 95px;
          z-index: 25;
          transform: translateY(-50%);
          animation: cargoDriveMiddle 2s linear forwards;
        }

        @keyframes cargoDriveMiddle {
          0% {
            left: -280px;
            opacity: 0;
            transform: translateY(-50%) scale(0.92);
          }
          5% { opacity: 1; }
          50% { opacity: 1; }
          95% { opacity: 1; }
          100% {
            left: calc(100% + 300px);
            opacity: 0;
            transform: translateY(-50%) scale(0.92);
          }
        }

        .cargo-truck {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 250px;
          height: 65px;
        }

        .truck-body {
          position: absolute;
          left: 0;
          bottom: 12px;
          width: 205px;
          height: 58px;
          border-radius: 5px 3px 4px 6px;
          background: linear-gradient(180deg, #ffffff, #e5e7eb);
          box-shadow: 0 10px 22px rgba(0,0,0,0.28);
        }

        .truck-body::before {
          content: '';
          position: absolute;
          left: 8px;
          right: 8px;
          top: 8px;
          bottom: 8px;
          border: 1px solid rgba(15,23,42,0.16);
          border-radius: 3px;
        }

        .container-lines {
          position: absolute;
          inset: 10px;
          display: flex;
          justify-content: space-between;
        }

        .container-lines span {
          width: 1px;
          height: 100%;
          background: rgba(15,23,42,0.12);
        }

        .container-brand {
          position: absolute;
          left: 22px;
          top: 50%;
          transform: translateY(-50%);
          width: 115px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
        }

        .container-brand img {
          width: 115px;
          height: auto;
          max-height: 34px;
          object-fit: contain;
          object-position: left center;
          opacity: 0.95;
        }

        .truck-cabin {
          position: absolute;
          right: 0;
          bottom: 12px;
          width: 55px;
          height: 45px;
          border-radius: 8px 12px 5px 5px;
          background: linear-gradient(135deg, #f8fafc, #94a3b8);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }

        .truck-window {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 28px;
          height: 16px;
          border-radius: 4px;
          background: linear-gradient(135deg, #334155, #0f172a);
          border: 1px solid rgba(255,255,255,0.18);
        }

        .truck-wheel {
          position: absolute;
          bottom: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #05070a;
          border: 3px solid #475569;
          box-shadow: inset 0 0 0 3px #111827;
        }

        .truck-wheel.one { left: 32px; }
        .truck-wheel.two { left: 168px; }
        .truck-wheel.three { right: 13px; }

        .cargo-glow {
          position: absolute;
          left: -30px;
          right: -30px;
          bottom: 0;
          height: 20px;
          border-radius: 50%;
          background: rgba(16,185,129,0.25);
          filter: blur(12px);
        }

        /* ============================================================
           ADDED: MANUFACTURING LAYER (truck is untouched)
           ============================================================ */

        .mfg-fx {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .mfg-vignette {
          z-index: 40;
          background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%);
        }

        .mfg-grain {
          inset: -50%;
          z-index: 41;
          opacity: 0.07;
          background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
          animation: mfgGrain 0.8s steps(6) infinite;
        }

        @keyframes mfgGrain {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-3%, 2%); }
          40% { transform: translate(2%, -3%); }
          60% { transform: translate(-2%, -1%); }
          80% { transform: translate(3%, 3%); }
          100% { transform: translate(0, 0); }
        }

        .mfg-bar {
          position: absolute;
          left: 0;
          right: 0;
          height: 7%;
          background: #000000;
          z-index: 38;
        }
        .mfg-bar-top { top: 0; }
        .mfg-bar-bottom { bottom: 0; }

        .mfg-eyebrow {
          margin-top: 6px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #34d399;
        }

        .mfg-stages {
          position: absolute;
          left: 50%;
          top: calc(50% + 100px);
          transform: translateX(-50%);
          width: min(900px, 82%);
          display: flex;
          justify-content: space-between;
          gap: 8px;
          z-index: 35;
          pointer-events: none;
        }

        .mfg-stage {
          flex: 1;
          padding: 7px 4px;
          text-align: center;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          white-space: nowrap;
          color: rgba(255,255,255,0.78);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
          transition: all 0.3s ease;
        }

        .mfg-stage i {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 6px;
          border-radius: 50%;
          background: #475569;
          vertical-align: middle;
        }

        .mfg-stage.is-current {
          color: #fbbf24;
          border-color: rgba(251,191,36,0.55);
          background: rgba(251,191,36,0.08);
        }
        .mfg-stage.is-current i {
          background: #fbbf24;
          box-shadow: 0 0 10px rgba(251,191,36,0.9);
        }

        .mfg-stage.is-done {
          color: #34d399;
          border-color: rgba(52,211,153,0.5);
          background: rgba(16,185,129,0.08);
        }
        .mfg-stage.is-done i {
          background: #10b981;
          box-shadow: 0 0 10px rgba(16,185,129,0.9);
        }

        .mfg-ticker {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 7%;
          min-height: 26px;
          display: flex;
          align-items: center;
          overflow: hidden;
          z-index: 39;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
        }

        .mfg-ticker-track {
          display: inline-flex;
          gap: 34px;
          padding-left: 34px;
          animation: mfgTicker 28s linear infinite;
        }

        .mfg-ticker-track span::before {
          content: '◆';
          margin-right: 34px;
          color: #10b981;
        }

        @keyframes mfgTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        /* ============================================================
           MOBILE
           ============================================================ */

        @media (max-width: 700px) {
          .loading-stage { width: 94vw; height: 70vh; border-radius: 0; }
          .loader-title { font-size: 21px; }
          .loader-message { font-size: 11px; }
          .production-progress { top: calc(50% - 112px); width: 84%; }
          .production-progress-labels { font-size: 8px; }
          .production-progress-status { font-size: 11px; }
          .production-progress-percentage { font-size: 17px; }
          .cargo-animation { transform: translateY(-50%) scale(0.8); }
          .mfg-stages { top: calc(50% + 88px); width: 94%; }
          .mfg-stage { font-size: 7px; letter-spacing: 0.04em; padding: 6px 2px; }
          .mfg-stage i { display: none; }
          .form-card { padding: 36px 24px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mfg-grain, .mfg-ticker-track { animation: none; }
        }
      `}</style>

      <div className="login-card">
        {/* LEFT BRAND PANEL */}
        <div className="scene-panel">
          <div className="panel-brand-content">
            <h1 className="hero-title">
              <span
                className="autocrat-animated-word"
                aria-label="Autocrat Engineers"
              >
                <TechText
                  text="AUTOCRAT    ENGINEERS"
                  fontSize={45}
                  fontWeight={800}
                  letterSpacing={-0.09}
                  color="#ff2222ff"
                  accentColor="#bdf7e1ff"
                  align="left"
                  reveal="letter"
                  specks={20}
                  labels={false}
                  draggable={false}
                  sweep={true}
                  speed={0.7}
                  intro="type"
                  introDuration={1.7}
                  className="autocrat-tech-text"
                />
              </span>
              <br />
              <span style={{ display: 'inline-block', marginLeft: '25px' }}>Advanced Manufacturing System</span>
            </h1>

            <span className="hero-caption" style={{ display: 'inline-block', marginLeft: '25px' }}>
              Streamlining precision engineering, inventory, and production
              workflows.
            </span>

            <div
              className="brand-grid-horizontal"
              style={{ marginLeft: '25px' }}
            >
              <div className="grid-item">
                <span className="grid-value">99%</span>
                <span className="grid-label">Precision</span>
              </div>

              <div className="grid-item">
                <span className="grid-value">24/7</span>
                <span className="grid-label">Uptime</span>
              </div>

              <div className="grid-item">
                <span className="grid-value">ISO 9001:2015</span>
                <span className="grid-label">Certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT LOGIN FORM */}
        <div className="form-panel-container">
          <div className="form-card">
            <div className="form-top">
              <img
                className="brand-logo-a"
                src={autocratAMark}
                alt="Autocrat Engineers"
              />
            </div>

            <div className="form-header">
              <h1 className="form-title">Welcome back</h1>
              <p className="form-sub">
                Sign in to your Autocrat account to continue.
              </p>
            </div>

            {/* USERNAME */}
            <div className="field-group">
              <label className="field-label" htmlFor="input-username">
                Username
              </label>

              <div className="email-input-wrap">
                <Mail className="email-input-icon" aria-hidden="true" />
                <input
                  id="input-username"
                  className={`id-input email-input${loginError ? ' input-error' : ''
                    }`}
                  type="email"
                  value={username}
                  disabled={isLoading}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="you@company.com"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="field-group">
              <label className="field-label" htmlFor="input-password">
                Password
              </label>

              <div className="password-input-wrap">
                <LockKeyhole
                  className="password-input-icon"
                  aria-hidden="true"
                />
                <input
                  id="input-password"
                  className={`id-input password-input${loginError ? ' input-error' : ''
                    }`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleContinue();
                    }
                  }}
                />

                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>

              {loginError && <div className="error-text">{loginError}</div>}
            </div>

            {/* REMEMBER ME */}
            <div className="remember-row">
              <input
                id="input-remember"
                type="checkbox"
                checked={remember}
                disabled={isLoading}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="input-remember">Remember me</label>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="button"
              className="btn-continue"
              onClick={handleContinue}
              disabled={isLoading}
              id="btn-login-continue"
            >
              {isLoading ? 'Preparing System...' : 'Login to System'}
            </button>
          </div>
        </div>
      </div>

      {/* CINEMATIC LOADING SCREEN */}
      {
        isLoading && (
          <div className="cinematic-loader" id="cinematic-login-loader">
            <div className="loading-stage">
              {/* STATUS TEXT */}
              <div className="loader-content">
                <h1 className="loader-title">Production System</h1>
                <div className="mfg-eyebrow">MRP · BOM · Routing · Work Orders . Quality</div>
              </div>

              {/* PRODUCTION PROGRESS */}
              <div className="production-progress">
                <div className="production-progress-labels">
                  <span>0%</span>
                  <span>100%</span>
                </div>

                <div className="production-progress-track">
                  <div
                    className="production-progress-fill"
                    style={{
                      width: `${loadingProgress}%`,
                    }}
                  />

                  <div
                    className="production-progress-marker"
                    style={{
                      left: `${loadingProgress}%`,
                    }}
                  />
                </div>

                <div key={loadingMessage} className="production-progress-status">
                  {loadingMessage}
                </div>

                <div className="production-progress-percentage">
                  {loadingProgress}%
                </div>
              </div>

              {/* AIRPORT / RUNWAY */}
              <div className="airport-ground">
                <div className="runway">
                  <div className="runway-line" />
                </div>

                {/* MOVING CARGO TRUCK */}
                <div className="cargo-animation">
                  <div className="cargo-glow" />

                  <div className="cargo-truck">
                    {/* CONTAINER */}
                    <div className="truck-body">
                      <div className="container-lines">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="container-brand">
                        <img src={autocratAMark} alt="Autocrat Engineers" />
                      </div>
                    </div>

                    {/* CABIN */}
                    <div className="truck-cabin">
                      <div className="truck-window" />
                    </div>

                    {/* WHEELS */}
                    <div className="truck-wheel one" />
                    <div className="truck-wheel two" />
                    <div className="truck-wheel three" />
                  </div>
                </div>
              </div>

              {/* ADDED: MANUFACTURING STAGE INDICATOR */}
              <div className="mfg-stages" aria-hidden="true">
                {MFG_STAGES.map((stage, i) => {
                  const nextAt = MFG_STAGES[i + 1] ? MFG_STAGES[i + 1].at : 100;
                  const state =
                    loadingProgress >= nextAt
                      ? 'is-done'
                      : loadingProgress >= stage.at
                        ? 'is-current'
                        : '';
                  return (
                    <div key={stage.short} className={`mfg-stage ${state}`}>
                      <i />
                      {stage.short}
                    </div>
                  );
                })}
              </div>

              {/* ADDED: CINEMATIC BARS, MANUFACTURING TERMS TICKER, FILM LOOK */}
              <div className="mfg-bar mfg-bar-top" />
              <div className="mfg-bar mfg-bar-bottom" />
              <div className="mfg-ticker" aria-hidden="true">
                <div className="mfg-ticker-track">
                  {[...TERMS, ...TERMS].map((term, i) => (
                    <span key={i}>{term}</span>
                  ))}
                </div>
              </div>
              <div className="mfg-fx mfg-vignette" />
              <div className="mfg-fx mfg-grain" />
            </div>
          </div>
        )
      }
    </div >
  );
}