// THE WORLD IN ONE PAGE — Monday 23 November 2026.
// One newspaper front page as a 1024 by 1024 PNG: six panels carrying the
// day's world news. The program needs no packages and no network. Running it
// twice writes the same bytes twice.
//   node main.ts   ->  /output/entry.png

import * as fs from "node:fs";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------------------
// Ink and paper.
// ---------------------------------------------------------------------------
type Tint = [number, number, number];
const NEWSPRINT: Tint = [246, 241, 230];
const INK: Tint = [25, 25, 25];
const FADED: Tint = [90, 84, 72];
const CRIMSON: Tint = [163, 22, 33];
const NAVY: Tint = [29, 78, 137];
const OCHRE: Tint = [176, 132, 38];

// ---------------------------------------------------------------------------
// The day's six stories. tag is the kicker line, title the headline, deck
// the one-line summary underneath.
// ---------------------------------------------------------------------------
interface Panel {
  tag: string;
  title: string;
  deck: string;
  tint: Tint;
}

const LEAD: Panel = {
  tag: "US MIDTERMS",
  title: "DEMOCRATS WIN BIGGEST HOUSE MAJORITY SINCE 1992",
  deck: "258 SEATS, +44; HUBBARD BEATS FOXX IN NORTH CAROLINA",
  tint: NAVY,
};

const MIDDLE: Panel[] = [
  {
    tag: "CLIMATE SUMMIT - ANTALYA",
    title: "UN CLIMATE TALKS COLLAPSE WITHOUT A DEAL",
    deck: "FINAL DRAFT DROPS ALL MENTION OF FOSSIL FUELS",
    tint: CRIMSON,
  },
  {
    tag: "GULF WAR",
    title: "HORMUZ WAR ENGULFS SAUDI ARABIA AND BAHRAIN",
    deck: "IRGC CLAIMS TWO PATRIOT RADARS DESTROYED; HOUTHI MISSILE DOWNED",
    tint: NAVY,
  },
];

const BOTTOM: Panel[] = [
  {
    tag: "BALTIC SEA",
    title: "RUSSIAN CARGO SHIP ABLAZE OFF FINLAND",
    deck: "DRONE ATTACK SETS SANCTIONED VESSEL ALIGHT; IT DRIFTS INTO FINNISH WATERS",
    tint: CRIMSON,
  },
  {
    tag: "WEST JAVA",
    title: "JAVA CANDY FACTORY FIRE",
    deck: "7 BODY BAGS FOUND; 50 WORKERS MISSING",
    tint: OCHRE,
  },
  {
    tag: "WASHINGTON",
    title: "FBI PROBES BREACH OF ITS CRIMINAL DATABASE",
    deck: "TRUMP CONFIRMS APPARENT HACK ON TV",
    tint: NAVY,
  },
];

// ---------------------------------------------------------------------------
// Letterforms. A 5 by 7 dot-matrix alphabet: seven rows per character, each
// row a decimal number whose five bits are the pixels, leftmost bit first.
// Capitals, numerals and the marks the page uses.
// ---------------------------------------------------------------------------
type Rows = number[];
const GLYPHS: Record<string, Rows> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "%": [25, 26, 2, 4, 8, 11, 19],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 6, 4, 0, 4],
  "+": [0, 4, 4, 14, 4, 4, 0],
  $: [4, 15, 20, 14, 5, 30, 4],
  '"': [10, 10, 0, 0, 0, 0, 0],
};

// ---------------------------------------------------------------------------
// PNG output, built by hand: 8-bit RGB, no extra chunks, so the bytes are a
// pure function of the pixels. Checksums use the IEEE CRC-32 polynomial.
// ---------------------------------------------------------------------------
const CRC_POLY = 3988292384;
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? CRC_POLY ^ (c >>> 1) : c >>> 1;
  CRC_TABLE.push(c >>> 0);
}

function checksum(bytes: Buffer): number {
  let c = 4294967295;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 4294967295) >>> 0;
}

function chunk(kind: string, data: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([Buffer.from(kind, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(checksum(payload), 0);
  return Buffer.concat([size, payload, crc]);
}

function toPngBytes(width: number, height: number, rgb: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const scanlines = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const start = y * (1 + width * 3);
    scanlines[start] = 0;
    scanlines.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), start + 1);
  }
  const magic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    magic,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The sheet: a flat RGB buffer with filled rectangles and magnified text.
// A character is 5 dots wide plus a 1-dot gap, 7 dots tall.
// ---------------------------------------------------------------------------
class Sheet {
  readonly w: number;
  readonly h: number;
  private dots: Uint8Array;

  constructor(w: number, h: number, paper: Tint) {
    this.w = w;
    this.h = h;
    this.dots = new Uint8Array(w * h * 3);
    this.rect(0, 0, w, h, paper);
  }

  rect(x: number, y: number, w: number, h: number, tint: Tint): void {
    const left = Math.max(0, x);
    const top = Math.max(0, y);
    const right = Math.min(this.w, x + w);
    const bottom = Math.min(this.h, y + h);
    for (let py = top; py < bottom; py++) {
      for (let px = left; px < right; px++) {
        const at = (py * this.w + px) * 3;
        this.dots[at] = tint[0];
        this.dots[at + 1] = tint[1];
        this.dots[at + 2] = tint[2];
      }
    }
  }

  glyph(x: number, y: number, ch: string, mag: number, tint: Tint): void {
    const rows = GLYPHS[ch] ?? GLYPHS["?"];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if ((rows[r] >> (4 - c)) & 1) {
          this.rect(x + c * mag, y + r * mag, mag, mag, tint);
        }
      }
    }
  }

  measure(text: string, mag: number): number {
    return text.length === 0 ? 0 : text.length * 6 * mag - mag;
  }

  text(x: number, y: number, str: string, mag: number, tint: Tint): void {
    let cx = x;
    for (const ch of str) {
      this.glyph(cx, y, ch, mag, tint);
      cx += 6 * mag;
    }
  }

  centred(y: number, str: string, mag: number, tint: Tint, from: number, to: number): void {
    const wide = this.measure(str, mag);
    this.text(from + Math.floor((to - from - wide) / 2), y, str, mag, tint);
  }

  // Greedy wrapping: keep adding words while the line still fits.
  wrap(str: string, fits: number, mag: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const word of str.split(" ")) {
      const next = line === "" ? word : line + " " + word;
      if (this.measure(next, mag) <= fits || line === "") {
        line = next;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line !== "") out.push(line);
    return out;
  }

  png(): Buffer {
    return toPngBytes(this.w, this.h, this.dots);
  }
}

// ---------------------------------------------------------------------------
// Page furniture. The sheet is 1024 square with 32-dot margins. A panel is
// a tinted rule, a kicker, a wrapped headline and a wrapped deck. Rows of
// panels are laid out from a small table instead of one call per panel.
// ---------------------------------------------------------------------------
const SIDE = 1024;
const EDGE = 32;
const RIGHT = SIDE - EDGE;
const INNER = SIDE - 2 * EDGE;

function paintPanel(
  sheet: Sheet,
  panel: Panel,
  x: number,
  y: number,
  wide: number,
  headMag: number,
  deckMag = 2,
): void {
  sheet.rect(x, y, wide, 6, panel.tint);
  sheet.text(x, y + 18, panel.tag, 2, panel.tint);
  let cy = y + 44;
  for (const line of sheet.wrap(panel.title, wide, headMag)) {
    sheet.text(x, cy, line, headMag, INK);
    cy += 7 * headMag + 4;
  }
  cy += 6;
  for (const line of sheet.wrap(panel.deck, wide, deckMag)) {
    sheet.text(x, cy, line, deckMag, FADED);
    cy += 7 * deckMag + 3;
  }
}

function paintSheet(): Sheet {
  const sheet = new Sheet(SIDE, SIDE, NEWSPRINT);

  sheet.centred(30, "THE WORLD IN ONE PAGE", 8, INK, EDGE, RIGHT);
  sheet.centred(104, "MONDAY, 23 NOVEMBER 2026", 2, FADED, EDGE, RIGHT);
  sheet.rect(EDGE, 128, INNER, 3, INK);
  sheet.rect(EDGE, 134, INNER, 1, INK);

  paintPanel(sheet, LEAD, EDGE, 152, INNER, 5, 3);
  sheet.rect(EDGE, 428, INNER, 2, INK);

  const half = Math.floor((INNER - 24) / 2);
  MIDDLE.forEach((panel, i) => {
    paintPanel(sheet, panel, EDGE + i * (half + 24), 452, half, 3);
  });
  sheet.rect(EDGE, 688, INNER, 2, INK);

  const third = Math.floor((INNER - 48) / 3);
  BOTTOM.forEach((panel, i) => {
    paintPanel(sheet, panel, EDGE + i * (third + 24), 712, third, 3);
  });

  sheet.rect(EDGE, 968, INNER, 2, INK);
  sheet.centred(982, "SIX STORIES - ONE PAGE - 23 NOVEMBER 2026", 2, FADED, EDGE, RIGHT);
  return sheet;
}

function main(): void {
  const bytes = paintSheet().png();
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync("/output/entry.png", bytes);
  console.log(`wrote /output/entry.png (${bytes.length} bytes, ${SIDE}x${SIDE})`);
}

main();
