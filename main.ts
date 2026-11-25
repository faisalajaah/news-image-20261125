// The World Today — Wednesday 25 November 2026.
// A newspaper front page drawn entirely in code: hand-made 5x7 pixel font,
// flat RGB buffer, small zlib PNG encoder. Node 22 standard library only,
// no network, no fonts, no dependencies. Deterministic: same bytes every run.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG out
const W = 1024;
const H = 1024;

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG(rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------- 5x7 pixel font
// Each glyph: 7 rows, each a 5-bit number (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
};

// Punctuation and symbols.
Object.assign(FONT, {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '+': [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
});

// ------------------------------------------------------------ colours
type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [17, 17, 17];
const RED: RGB = [176, 32, 32];
const BLUE: RGB = [26, 74, 138];
const DARKBLUE: RGB = [16, 42, 84];
const TEAL: RGB = [14, 110, 110];
const ORANGE: RGB = [214, 110, 20];
const GOLD: RGB = [196, 148, 32];
const GREY: RGB = [110, 104, 92];
const LIGHTGREY: RGB = [226, 220, 208];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [10, 10, 14];
const GREEN: RGB = [24, 120, 60];
const SKY: RGB = [178, 214, 235];
const SEA: RGB = [28, 96, 140];
const SAND: RGB = [232, 205, 150];

// ------------------------------------------------------------ canvas
class Page {
  buf: Buffer;
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = PAPER[0];
      this.buf[i * 3 + 1] = PAPER[1];
      this.buf[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: RGB): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  frame(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0), t, c);
  }
  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    this.rect(x, Math.min(y0, y1), t, Math.abs(y1 - y0), c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (dx * i) / steps);
      const y = Math.round(y0 + (dy * i) / steps);
      if (t <= 1) this.px(x, y, c);
      else this.rect(x - ((t / 2) | 0), y - ((t / 2) | 0), t, t, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++)
        this.px(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      const edges: [number, number, number, number][] = [
        [x0, y0, x1, y1],
        [x1, y1, x2, y2],
        [x2, y2, x0, y0],
      ];
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
          xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
        }
      }
      if (xs.length >= 2) {
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        for (let x = Math.ceil(lo); x <= hi; x++) this.px(x, y, c);
      }
    }
  }
  // Text: uppercase only font; unknown chars become a blank.
  text(x: number, y: number, s: string, scale: number, c: RGB): number {
    let cx = x;
    const up = s.toUpperCase();
    for (const ch of up) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++)
        for (let col = 0; col < 5; col++)
          if (g[r] & (16 >> col)) this.rect(cx + col * scale, y + r * scale, scale, scale, c);
      cx += 6 * scale;
    }
    return cx - x;
  }
  textW(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  center(y: number, s: string, scale: number, c: RGB, x0 = 0, x1 = W): number {
    const w = this.textW(s, scale);
    return this.text(x0 + ((x1 - x0 - w) / 2 | 0), y, s, scale, c);
  }
}

// Word-wrap plain text to a pixel width at a given scale.
function wrap(p: Page, s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (p.textW(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ------------------------------------------------------------ stories
// All 34 stories are events of Wednesday 25 November 2026 (or first
// reported that day), checked against same-day news sources. No invented
// figures: numbers used are the ones the sources reported.
type Story = { tag: string; color: RGB; head: string; sum: string };
const TAGCOLOR: Record<string, RGB> = {
  WORLD: RED, EUROPE: BLUE, MIDEAST: ORANGE, TECH: TEAL, MARKETS: GREEN,
  POLITICS: DARKBLUE, PACIFIC: TEAL, ASIA: [150, 110, 20], AMERICAS: BLUE,
  AFRICA: GREEN, SPORT: RED, CLIMATE: GREEN,
};
function st(tag: string, head: string, sum: string): Story {
  return { tag, color: TAGCOLOR[tag] ?? INK, head, sum };
}

const HEROES: { head: string; sum: string; art: string }[] = [
  {
    head: 'TANKERS HIT BY MINES IN HORMUZ STRAIT',
    sum: 'IRGC: tankers caught fire under US escort; oil slides as Gulf route in doubt',
    art: 'hormuz',
  },
  {
    head: 'AI SELLOFF HITS ASIAN MARKETS',
    sum: 'Nvidia slides about 6% as the AI rally fades; Nikkei, Kospi and Taiex fall sharply',
    art: 'ai',
  },
  {
    head: "ALL HOSTAGES FREED IN CARTAGENA",
    sum: 'Forces storm a Cartagena supermarket after a day-long siege; no hostages hurt',
    art: 'cartagena',
  },
  {
    head: "PAKISTAN'S FIRST ASTRONAUT IN ORBIT",
    sum: "Pakistan's first astronaut reaches China's space station",
    art: 'space',
  },
];

const COLUMNS: Story[][] = [
  [
    st('WORLD', 'COP31 TALKS COLLAPSE IN ANTALYA', 'No deal as oil states block fossil-fuel phaseout'),
    st('WORLD', 'PUTIN VOWS REVENGE FOR STRIKES', 'Retaliation promised over refinery attacks'),
    st('EUROPE', 'KYIV CLAIMS BALTIC SHIP STRIKE', 'Zelensky: every Russian ship a target'),
    st('EUROPE', 'MAGYAR MEETS ZELENSKY IN UZHHOROD', 'Hungary PM holds first formal talks'),
    st('MIDEAST', 'KYIV CALLS BENGHAZI STRIKE SELF-DEFENCE', 'Libya seeks emergency UN council meeting'),
    st('MIDEAST', 'HOUTHI DRONE HITS RIYADH TOWER', 'Eleven hurt; coalition strikes Hodeidah'),
    st('TECH', 'HUAWEI CONVICTED IN US COURT', 'Guilty on sanctions and trade-secret counts'),
    st('MARKETS', 'US READIES NEW GLOBAL TARIFFS', 'Move follows trade probe findings'),
  ],
  [
    st('POLITICS', 'DEMOCRATS WIN HOUSE MAJORITY', 'At least 259 seats in Washington'),
    st('EUROPE', 'SPAIN HEADS TO SNAP ELECTION', 'Voters to return to the polls'),
    st('PACIFIC', 'SOLOMON ISLANDS SIGN SECURITY PACT', 'Australia deal bars foreign bases'),
    st('ASIA', 'CHINA PROBES SHANGHAI PARTY CHIEF', 'Chen Jining under investigation'),
    st('AMERICAS', 'ABREGO GARCIA LEAVES US FOR SPAIN', 'Deportation case ends in departure'),
    st('MIDEAST', 'IRAN FLOGS SINGER 74 TIMES', 'Punishment over unveiled concert'),
    st('AFRICA', 'CONGO JET MISSING, REBELS CLAIM HIT', 'Military aircraft lost in Minembwe'),
    st('AMERICAS', 'PENTAGON FAULTS CANADA SPENDING', 'US criticises Ottawa defence budget'),
  ],
  [
    st('ASIA', 'HONG KONG MARKS YEAR SINCE TAI PO FIRE', 'City remembers the disaster'),
    st('AFRICA', 'ZAMBIA INDICTS OPPOSITION LEADER', 'Treason charges filed in Lusaka'),
    st('ASIA', 'DOZENS TRAPPED IN INDONESIA MINE', 'Rescuers race rains at 100-metre pit'),
    st('AFRICA', 'DRONE STRIKES HIT KHARTOUM', 'Abductions reported in Blue Nile'),
    st('SPORT', "SENEGAL'S AFRICA CUP TITLE RESTORED", 'Sport court rules for Senegal'),
    st('SPORT', 'REAL MADRID HIT PSV FOR FIVE', 'Bellingham wondergoal in 5-1 rout'),
    st('SPORT', 'CITY AND ARSENAL HELD AT HOME', 'City 2-2 Napoli; Arsenal 1-1 Dortmund'),
  ],
  [
    st('TECH', 'CIA SYSTEM BREACHED, AP REPORTS', 'Unclassified network hit'),
    st('TECH', 'MICROSOFT DECLARES CODE RED', 'Exchange Online outage hits users'),
    st('MARKETS', 'BITCOIN SLIDES BELOW $60,000', 'Down 20% in November'),
    st('ASIA', 'BANGLADESH RAISES TEXTILE PAY 36%', 'Minimum wage up after protests'),
    st('AMERICAS', 'SIX DEAD IN GULF PLANE CRASH', 'Small plane down in Gulf of Mexico'),
    st('AMERICAS', 'WHO CHIEF: END CUBA FUEL BLOCKADE', 'US blockade condemned'),
    st('CLIMATE', 'DUTCH COURT KEEPS CLIMATE TARGETS', 'Binding goals stay mandatory'),
  ],
];

// ------------------------------------------------------------ art panels
function artHormuz(p: Page, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, SKY);
  p.circle(x + w - 52, y + 22, 15, GOLD);
  p.rect(x, y + h * 0.55, w, h * 0.45, SEA);
  p.hline(x, x + w, y + h * 0.55, WHITE, 2);
  // tanker
  const tx = x + 40;
  const ty = y + h * 0.52;
  p.rect(tx, ty, 220, 26, [40, 40, 44]);
  p.rect(tx + 150, ty - 22, 46, 22, [200, 60, 40]);
  p.rect(tx + 150, ty - 26, 46, 4, INK);
  p.rect(tx + 20, ty - 12, 30, 12, WHITE);
  p.rect(tx + 60, ty - 12, 30, 12, GOLD);
  p.rect(tx + 100, ty - 12, 30, 12, WHITE);
  p.rect(tx, ty + 26, 220, 4, [20, 60, 90]);
  // mine with spikes
  const mx = x + w - 90;
  const my = y + h * 0.72;
  for (let a = 0; a < 360; a += 30) {
    const r = (a * Math.PI) / 180;
    p.line(mx, my, Math.round(mx + 20 * Math.cos(r)), Math.round(my + 20 * Math.sin(r)), BLACK, 3);
  }
  p.circle(mx, my, 11, BLACK);
  // explosion burst over the tanker
  const ex = tx + 120;
  const ey = y + 18;
  for (let a = 0; a < 360; a += 24) {
    const r = (a * Math.PI) / 180;
    p.line(ex, ey, Math.round(ex + 26 * Math.cos(r)), Math.round(ey + 26 * Math.sin(r)), ORANGE, 4);
  }
  p.circle(ex, ey, 13, [255, 200, 40]);
  p.circle(ex, ey, 7, ORANGE);
  // waves
  for (let i = 0; i < 5; i++) {
    p.line(x + 14 + i * 96, y + h - 12, x + 34 + i * 96, y + h - 12, WHITE, 2);
  }
}

function artAI(p: Page, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, DARKBLUE);
  for (let gx = x + 24; gx < x + w; gx += 32) p.vline(gx, y, y + h, [30, 70, 130], 1);
  for (let gy = y + 16; gy < y + h; gy += 24) p.hline(x, x + w, gy, [30, 70, 130], 1);
  // chip
  const cx = x + 34;
  const cy = y + 22;
  p.rect(cx, cy, 52, 52, [200, 210, 225]);
  p.rect(cx + 12, cy + 12, 28, 28, TEAL);
  p.rect(cx + 20, cy + 20, 12, 12, WHITE);
  for (let i = 0; i < 5; i++) {
    p.rect(cx + 8 + i * 9, cy - 8, 4, 8, GOLD);
    p.rect(cx + 8 + i * 9, cy + 52, 4, 8, GOLD);
    p.rect(cx - 8, cy + 8 + i * 9, 8, 4, GOLD);
    p.rect(cx + 52, cy + 8 + i * 9, 8, 4, GOLD);
  }
  // falling red chart line with arrow
  const pts: [number, number][] = [
    [x + 130, y + 16], [x + 190, y + 22], [x + 240, y + 18],
    [x + 300, y + 40], [x + 350, y + 52], [x + 410, y + 78],
  ];
  for (let i = 0; i < pts.length - 1; i++)
    p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], [255, 70, 60], 4);
  const [ax, ay] = pts[pts.length - 1];
  p.tri(ax, ay, ax - 16, ay - 2, ax - 4, ay - 16, [255, 70, 60]);
  p.text(x + 330, y + 12, '-6%', 2, [255, 70, 60]);
  p.text(x + 130, y + 66, 'AI RALLY FADES', 1, [180, 200, 220]);
}

function artCartagena(p: Page, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, SKY);
  p.circle(x + w - 46, y + 18, 12, GOLD);
  // storefront
  const bx = x + 60;
  const by = y + 12;
  p.rect(bx, by, 360, h - 12, SAND);
  p.rect(bx, by, 360, 8, RED);
  for (let i = 0; i < 12; i++) p.rect(bx + i * 30, by + 8, 15, 12, i % 2 ? WHITE : RED);
  p.rect(bx + 20, by + 28, 90, 26, [120, 180, 220]);
  p.rect(bx + 130, by + 28, 90, 26, [120, 180, 220]);
  p.rect(bx + 240, by + 28, 90, 26, [120, 180, 220]);
  p.rect(bx + 150, by + 54, 60, h - 54, [90, 60, 30]);
}

function artSpace(p: Page, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, BLACK);
  const stars: [number, number][] = [
    [20, 10], [60, 30], [110, 8], [160, 26], [220, 12], [300, 8], [360, 24],
    [420, 10], [40, 44], [260, 40], [390, 44], [140, 48],
  ];
  for (const [sx, sy] of stars) p.rect(x + sx, y + sy, 2, 2, WHITE);
  // Small planet, fully inside the art panel
  p.circle(x + w - 64, y + 40, 17, [40, 110, 200]);
  p.circle(x + w - 70, y + 36, 8, [60, 160, 90]);
  p.circle(x + w - 56, y + 46, 5, [60, 160, 90]);
  // space station
  const sx = x + 250;
  const sy = y + 14;
  p.rect(sx, sy, 130, 10, [180, 190, 200]);
  p.rect(sx + 55, sy - 6, 20, 22, [220, 225, 230]);
  p.rect(sx - 30, sy + 2, 28, 6, BLUE);
  p.rect(sx + 132, sy + 2, 28, 6, BLUE);
  // rocket
  const rx = x + 110;
  const ry = y + 8;
  p.rect(rx, ry + 10, 22, 34, WHITE);
  p.tri(rx, ry + 10, rx + 22, ry + 10, rx + 11, ry - 8, RED);
  p.rect(rx - 6, ry + 30, 6, 14, RED);
  p.rect(rx + 22, ry + 30, 6, 14, RED);
  p.tri(rx + 4, ry + 44, rx + 18, ry + 44, rx + 11, ry + 58, ORANGE);
}

const ART: Record<string, (p: Page, x: number, y: number, w: number, h: number) => void> = {
  hormuz: artHormuz,
  ai: artAI,
  cartagena: artCartagena,
  space: artSpace,
};

// ------------------------------------------------------------ layout
function drawHero(p: Page, x: number, y: number, w: number, h: number, hero: (typeof HEROES)[number], big: boolean): void {
  p.rect(x, y, w, h, WHITE);
  p.frame(x, y, w, h, INK, 2);
  const artH = big ? 92 : 64;
  ART[hero.art](p, x + 2, y + 2, w - 4, artH);
  const tx = x + 10;
  const tw = w - 20;
  const headLines = wrap(p, hero.head, big ? 3 : 2, tw);
  let hy = y + artH + 8;
  for (const ln of headLines) {
    p.text(tx, hy, ln, big ? 3 : 2, big ? RED : INK);
    hy += big ? 22 : 15;
  }
  const sumLines = wrap(p, hero.sum, 1, tw);
  for (const ln of sumLines.slice(0, big ? 2 : 1)) {
    p.text(tx, hy + 2, ln, 1, INK);
    hy += 9;
  }
}

function drawColumn(p: Page, x: number, y: number, w: number, stories: Story[]): void {
  let cy = y;
  for (const s of stories) {
    p.text(x, cy, s.tag, 1, s.color);
    cy += 9;
    const headLines = wrap(p, s.head, 2, w).slice(0, 2);
    for (const ln of headLines) {
      p.text(x, cy, ln, 2, INK);
      cy += 14;
    }
    const sumLines = wrap(p, s.sum, 1, w).slice(0, 2);
    for (const ln of sumLines) {
      p.text(x, cy, ln, 1, GREY);
      cy += 8;
    }
    cy += 5;
    p.hline(x, x + w, cy - 3, LIGHTGREY, 1);
  }
}

function main(): void {
  const p = new Page();
  p.frame(14, 14, 996, 996, INK, 3);
  // Masthead
  p.hline(24, 1000, 26, INK, 2);
  p.center(34, 'THE WORLD TODAY', 7, INK);
  p.center(88, 'WEDNESDAY 25 NOVEMBER 2026', 3, RED);
  p.hline(24, 1000, 114, INK, 2);
  p.hline(24, 1000, 118, INK, 1);
  // Kicker strip
  p.center(128, '34 STORIES FROM EVERY CONTINENT - POLITICS - MARKETS - TECH - SPORT - CLIMATE - CULTURE', 1, GREY);
  p.hline(24, 1000, 146, INK, 1);
  // Hero rows
  drawHero(p, 20, 154, 480, 180, HEROES[0], true);
  drawHero(p, 524, 154, 480, 180, HEROES[1], true);
  drawHero(p, 20, 342, 480, 132, HEROES[2], false);
  drawHero(p, 524, 342, 480, 132, HEROES[3], false);
  // Section divider
  p.hline(20, 1004, 486, INK, 2);
  p.text(20, 496, 'THE DAY IN BRIEF', 2, INK);
  p.text(700, 496, '30 MORE STORIES', 2, RED);
  // Columns
  const colX = [20, 268, 516, 764];
  const colW = 238;
  COLUMNS.forEach((stories, i) => drawColumn(p, colX[i], 522, colW, stories));
  // Footer ticker
  p.hline(20, 1004, 982, INK, 2);
  p.center(990, 'S&P 500 -0.5%  |  NIKKEI -2.8%  |  BRENT $87  |  GOLD $3,544  |  BITCOIN BELOW $60,000', 1, GREY);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG(p.buf));
}

main();
