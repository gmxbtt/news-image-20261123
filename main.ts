// THE WORLD IN ONE PAGE — 23 November 2026
// A program that draws one newspaper front page (1024x1024 PNG) summing up
// the day's world news in six panels. No dependencies, no network, fully
// deterministic: the same run always writes the same bytes.
// Run: node main.ts   (writes /output/entry.png)

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit number whose
// most significant bit is the leftmost pixel. Uppercase, digits and the
// punctuation this page needs.
// ---------------------------------------------------------------------------
type Glyph = number[];
const FONT: Record<string, Glyph> = {
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
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
};

// ---------------------------------------------------------------------------
// Minimal PNG writer: 8-bit RGB, no ancillary chunks, so the output bytes
// depend only on the pixels. CRC-32 (IEEE) over type + data per chunk.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with rectangle fill and scaled bitmap text.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Page {
  readonly width: number;
  readonly height: number;
  private pixels: Uint8Array;

  constructor(width: number, height: number, bg: RGB) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 3);
    this.fillRect(0, 0, width, height, bg);
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGB): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 3;
        this.pixels[i] = color[0];
        this.pixels[i + 1] = color[1];
        this.pixels[i + 2] = color[2];
      }
    }
  }

  // Draw one glyph with its top-left corner at (x, y), scaled by `scale`.
  drawChar(x: number, y: number, ch: string, scale: number, color: RGB): void {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          this.fillRect(x + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
  }

  // Width in pixels of `text` at this scale (5 px glyph + 1 px gap each).
  textWidth(text: string, scale: number): number {
    if (text.length === 0) return 0;
    return text.length * 6 * scale - scale;
  }

  drawText(x: number, y: number, text: string, scale: number, color: RGB): void {
    let cx = x;
    for (const ch of text) {
      this.drawChar(cx, y, ch, scale, color);
      cx += 6 * scale;
    }
  }

  drawCentered(y: number, text: string, scale: number, color: RGB, x0: number, x1: number): void {
    const w = this.textWidth(text, scale);
    this.drawText(x0 + Math.floor((x1 - x0 - w) / 2), y, text, scale, color);
  }

  // Greedy word wrap; returns the lines that fit `maxWidth` at `scale`.
  wrapText(text: string, maxWidth: number, scale: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const trial = current === "" ? word : current + " " + word;
      if (this.textWidth(trial, scale) <= maxWidth || current === "") {
        current = trial;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current !== "") lines.push(current);
    return lines;
  }

  toPng(): Buffer {
    return encodePng(this.width, this.height, this.pixels);
  }
}

// ---------------------------------------------------------------------------
// The six stories of 23 November 2026, as the front page tells them.
// ---------------------------------------------------------------------------
const PAPER: RGB = [246, 241, 230]; // warm newsprint
const INK: RGB = [25, 25, 25];
const MUTED: RGB = [90, 84, 72];
const RED: RGB = [163, 22, 33];
const BLUE: RGB = [29, 78, 137];
const GOLD: RGB = [176, 132, 38];

interface Story {
  kicker: string;
  headline: string;
  body: string;
  accent: RGB;
}

const LEAD: Story = {
  kicker: "US MIDTERMS",
  headline: "DEMOCRATS WIN BIGGEST HOUSE MAJORITY SINCE 1992",
  body: "258 SEATS, +44; HUBBARD BEATS FOXX IN NORTH CAROLINA",
  accent: BLUE,
};

const SECOND_ROW: Story[] = [
  {
    kicker: "CLIMATE SUMMIT - ANTALYA",
    headline: "UN CLIMATE TALKS COLLAPSE WITHOUT A DEAL",
    body: "FINAL DRAFT DROPS ALL MENTION OF FOSSIL FUELS",
    accent: RED,
  },
  {
    kicker: "GULF WAR",
    headline: "HORMUZ WAR ENGULFS SAUDI ARABIA AND BAHRAIN",
    body: "IRGC CLAIMS TWO PATRIOT RADARS DESTROYED; HOUTHI MISSILE DOWNED",
    accent: BLUE,
  },
];

const THIRD_ROW: Story[] = [
  {
    kicker: "BALTIC SEA",
    headline: "RUSSIAN CARGO SHIP ABLAZE OFF FINLAND",
    body: "DRONE ATTACK SETS SANCTIONED VESSEL ALIGHT; IT DRIFTS INTO FINNISH WATERS",
    accent: RED,
  },
  {
    kicker: "WEST JAVA",
    headline: "JAVA CANDY FACTORY FIRE",
    body: "7 BODY BAGS FOUND; 50 WORKERS MISSING",
    accent: GOLD,
  },
  {
    kicker: "WASHINGTON",
    headline: "FBI PROBES BREACH OF ITS CRIMINAL DATABASE",
    body: "TRUMP CONFIRMS APPARENT HACK ON TV",
    accent: BLUE,
  },
];

// ---------------------------------------------------------------------------
// Layout: 1024x1024, 32 px margins. Masthead, dateline, double rule, lead
// story full width, two stories side by side, three stories side by side,
// footer strip. Every panel: accent bar, kicker, headline, body.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const MARGIN = 32;
const CONTENT_RIGHT = W - MARGIN;
const CONTENT_W = W - 2 * MARGIN;

function drawStoryPanel(
  page: Page,
  story: Story,
  x: number,
  y: number,
  w: number,
  headlineScale: number,
  bodyScale = 2,
): void {
  // Accent bar on top of the panel.
  page.fillRect(x, y, w, 6, story.accent);
  // Kicker, small and letterspaced by the font itself.
  page.drawText(x, y + 18, story.kicker, 2, story.accent);
  // Headline, wrapped to the panel width.
  const headLines = page.wrapText(story.headline, w, headlineScale);
  let cy = y + 44;
  for (const line of headLines) {
    page.drawText(x, cy, line, headlineScale, INK);
    cy += 7 * headlineScale + 4;
  }
  // Body, wrapped, muted ink.
  const bodyLines = page.wrapText(story.body, w, bodyScale);
  cy += 6;
  for (const line of bodyLines) {
    page.drawText(x, cy, line, bodyScale, MUTED);
    cy += 7 * bodyScale + 3;
  }
}

function buildPage(): Page {
  const page = new Page(W, H, PAPER);

  // Masthead.
  page.drawCentered(30, "THE WORLD IN ONE PAGE", 8, INK, MARGIN, CONTENT_RIGHT);
  // Dateline.
  page.drawCentered(104, "MONDAY, 23 NOVEMBER 2026", 2, MUTED, MARGIN, CONTENT_RIGHT);
  // Double rule under the masthead.
  page.fillRect(MARGIN, 128, CONTENT_W, 3, INK);
  page.fillRect(MARGIN, 134, CONTENT_W, 1, INK);

  // Lead story, full width. Bigger headline and body than the small panels.
  drawStoryPanel(page, LEAD, MARGIN, 152, CONTENT_W, 5, 3);
  page.fillRect(MARGIN, 428, CONTENT_W, 2, INK);

  // Second row: two panels.
  const halfW = Math.floor((CONTENT_W - 24) / 2);
  drawStoryPanel(page, SECOND_ROW[0], MARGIN, 452, halfW, 3);
  drawStoryPanel(page, SECOND_ROW[1], MARGIN + halfW + 24, 452, halfW, 3);
  page.fillRect(MARGIN, 688, CONTENT_W, 2, INK);

  // Third row: three panels.
  const thirdW = Math.floor((CONTENT_W - 48) / 3);
  for (let i = 0; i < THIRD_ROW.length; i++) {
    drawStoryPanel(page, THIRD_ROW[i], MARGIN + i * (thirdW + 24), 712, thirdW, 3);
  }

  // Footer strip.
  page.fillRect(MARGIN, 968, CONTENT_W, 2, INK);
  page.drawCentered(982, "SIX STORIES - ONE PAGE - 23 NOVEMBER 2026", 2, MUTED, MARGIN, CONTENT_RIGHT);

  return page;
}

function main(): void {
  const page = buildPage();
  const png = page.toPng();
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.png", png);
  console.log(`wrote /output/entry.png (${png.length} bytes, ${W}x${H})`);
}

main();
