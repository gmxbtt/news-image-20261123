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
// Letterforms. A 5 by 7 dot-matrix alphabet: each character is seven strings
// of five bits, "1" for ink and "0" for paper, leftmost bit first. Capitals,
// numerals and the marks the page uses.
// ---------------------------------------------------------------------------
type Rows = string[];
const GLYPHS: Record<string, Rows> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
};

// ---------------------------------------------------------------------------
// PNG output, built by hand: 8-bit RGB, no extra chunks, so the bytes are a
// pure function of the pixels. The checksum is CRC-32, computed one bit at
// a time against the reflected polynomial, with no lookup table.
// ---------------------------------------------------------------------------
const CRC_POLY = 3988292384;

function checksum(bytes: Buffer): number {
  let c = 4294967295;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? CRC_POLY ^ (c >>> 1) : c >>> 1;
    }
  }
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
      const row = rows[r];
      for (let c = 0; c < 5; c++) {
        if (row[c] === "1") {
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
  const first = paintSheet().png();
  const second = paintSheet().png();
  const stable = first.equals(second);
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync("/output/entry.png", first);
  console.log(`wrote /output/entry.png (${first.length} bytes, ${SIDE}x${SIDE})`);
  console.log(`deterministic: ${stable ? "yes" : "no"}`);
  if (!stable) process.exit(1);
}

main();
