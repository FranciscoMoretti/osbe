#!/usr/bin/env python3
import binascii
import os
import shutil
import struct
import subprocess
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets"
TMP = OUT / "_tmp"


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(">I", binascii.crc32(kind + data) & 0xFFFFFFFF)
    )


def strip_alpha_to_rgb(src: Path, dest: Path, background=(255, 255, 255)) -> None:
    raw = src.read_bytes()
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{src} is not a PNG")

    pos = 8
    width = height = color_type = bit_depth = None
    idat_parts = []
    passthrough = []

    while pos < len(raw):
        length = struct.unpack(">I", raw[pos : pos + 4])[0]
        kind = raw[pos + 4 : pos + 8]
        data = raw[pos + 8 : pos + 8 + length]
        pos += 12 + length

        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", data
            )
            if bit_depth != 8 or color_type not in (2, 6) or compression != 0 or filter_method != 0 or interlace != 0:
                raise ValueError(f"Unsupported PNG format for {src}")
        elif kind == b"IDAT":
            idat_parts.append(data)
        elif kind not in {b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB", b"iCCP"}:
            passthrough.append((kind, data))

    if color_type == 2:
        dest.write_bytes(raw)
        return

    channels = 4
    stride = width * channels
    decompressed = zlib.decompress(b"".join(idat_parts))
    rows = []
    prev = [0] * stride
    offset = 0

    for _ in range(height):
        filter_type = decompressed[offset]
        offset += 1
        scanline = list(decompressed[offset : offset + stride])
        offset += stride
        recon = [0] * stride

        for i, value in enumerate(scanline):
            left = recon[i - channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i - channels] if i >= channels else 0

            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = up
            elif filter_type == 3:
                predictor = (left + up) // 2
            elif filter_type == 4:
                predictor = paeth(left, up, up_left)
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}")

            recon[i] = (value + predictor) & 0xFF

        rgb = bytearray()
        for i in range(0, len(recon), 4):
            alpha = recon[i + 3] / 255
            for channel, bg in zip(recon[i : i + 3], background):
                rgb.append(round(channel * alpha + bg * (1 - alpha)))

        rows.append(bytes([0]) + bytes(rgb))
        prev = recon

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    dest.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + b"".join(png_chunk(kind, data) for kind, data in passthrough)
        + png_chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
        + png_chunk(b"IEND", b"")
    )


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def svg_to_png(svg: str, dest: Path, strip_alpha=False) -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    tmp_svg = TMP / f"{dest.stem}.svg"
    tmp_png = TMP / f"{dest.stem}.rgba.png"
    tmp_svg.write_text(svg, encoding="utf-8")
    subprocess.run(
        ["sips", "-s", "format", "png", str(tmp_svg), "--out", str(tmp_png)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if strip_alpha:
        strip_alpha_to_rgb(tmp_png, dest)
    else:
        dest.write_bytes(tmp_png.read_bytes())


def esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def text(x, y, value, size=28, weight=500, fill="#111827", anchor="start"):
    return (
        f'<text x="{x}" y="{y}" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, '
        f"'Segoe UI', sans-serif\" font-size=\"{size}\" font-weight=\"{weight}\" fill=\"{fill}\" "
        f'text-anchor="{anchor}">{esc(value)}</text>'
    )


def store_icon_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="paper" x1="32" y1="18" x2="100" y2="108" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef2ff"/>
    </linearGradient>
    <linearGradient id="mark" x1="30" y1="26" x2="98" y2="104" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <path d="M38 16h38l22 22v58c0 8.8-7.2 16-16 16H38c-8.8 0-16-7.2-16-16V32c0-8.8 7.2-16 16-16Z" fill="url(#paper)"/>
  <path d="M76 16v19c0 4.4 3.6 8 8 8h14" fill="#dbeafe"/>
  <path d="M38 16h38l22 22v58c0 8.8-7.2 16-16 16H38c-8.8 0-16-7.2-16-16V32c0-8.8 7.2-16 16-16Z" fill="none" stroke="#172554" stroke-width="4"/>
  <path d="M38 73h52" stroke="url(#mark)" stroke-width="8" stroke-linecap="round"/>
  <path d="M44 53l11 11-11 11" fill="none" stroke="#2563eb" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M69 52l-10 34" fill="none" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>
</svg>"""


def browser_frame(content: str) -> str:
    return f"""
  <rect width="1280" height="800" fill="#f8fafc"/>
  <rect x="48" y="42" width="1184" height="716" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="48" y="42" width="1184" height="58" rx="18" fill="#f1f5f9"/>
  <circle cx="78" cy="72" r="7" fill="#ef4444"/><circle cx="101" cy="72" r="7" fill="#f59e0b"/><circle cx="124" cy="72" r="7" fill="#22c55e"/>
  <rect x="170" y="58" width="690" height="28" rx="14" fill="#ffffff" stroke="#d1d5db"/>
  {text(194, 78, "https://example.dev/articles/browser-notes", 15, 500, "#64748b")}
  {content}
"""


def screenshot_one() -> str:
    content = f"""
  <rect x="94" y="143" width="620" height="36" rx="8" fill="#dbeafe"/>
  {text(114, 170, "Clip the whole page as Markdown", 24, 700, "#172554")}
  {text(96, 225, "Research notes", 48, 800)}
  {text(96, 272, "A focused article with images, lists, and code blocks ready to save.", 24, 400, "#475569")}
  <rect x="96" y="320" width="560" height="120" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
  {text(126, 358, "function clipPage() {", 22, 600, "#0f172a")}
  {text(126, 392, "  return markdown;", 22, 500, "#2563eb")}
  {text(126, 426, "}", 22, 600, "#0f172a")}
  <rect x="96" y="485" width="520" height="18" rx="9" fill="#e2e8f0"/>
  <rect x="96" y="522" width="450" height="18" rx="9" fill="#e2e8f0"/>
  <rect x="96" y="559" width="500" height="18" rx="9" fill="#e2e8f0"/>
  <rect x="812" y="144" width="360" height="352" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="812" y="144" width="360" height="352" rx="16" fill="none" stroke="#0f172a" stroke-width="1"/>
  <rect x="836" y="168" width="42" height="42" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
  <path d="M850 181h14l8 8v18h-22z" fill="#dbeafe" stroke="#0f172a" stroke-width="2"/>
  {text(892, 190, "OSBE Markdown Clipper", 20, 700)}
  {text(892, 213, "Save the active page as Markdown.", 14, 400, "#64748b")}
  <rect x="836" y="242" width="312" height="98" rx="9" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="860" y="274" width="18" height="18" rx="4" fill="#0f172a"/>
  <path d="M865 283l4 4 8-10" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  {text(900, 291, "Include images", 17, 600)}
  {text(860, 322, "Downloads a ZIP with Markdown and assets.", 13, 400, "#64748b")}
  <rect x="836" y="366" width="312" height="48" rx="8" fill="#0f172a"/>
  {text(992, 397, "Clip Whole Page", 17, 700, "#ffffff", "middle")}
  <rect x="836" y="438" width="312" height="34" rx="8" fill="#f1f5f9"/>
  {text(858, 461, "Ready to clip the active tab.", 13, 500, "#64748b")}
"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">{browser_frame(content)}</svg>'


def screenshot_two() -> str:
    content = f"""
  {text(100, 164, "Turn selected content into Markdown", 44, 800)}
  {text(100, 214, "Select a paragraph, quote, or code block, then use OSBE from the right-click menu.", 23, 400, "#475569")}
  <rect x="100" y="276" width="700" height="250" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
  {text(132, 326, "The clipped selection keeps headings, links, and code blocks.", 24, 600)}
  <rect x="130" y="358" width="610" height="118" rx="8" fill="#dbeafe"/>
  {text(156, 398, "Selected page content", 25, 700, "#172554")}
  {text(156, 434, "OSBE reads this highlighted region only after you choose an action.", 20, 500, "#1e3a8a")}
  <rect x="838" y="284" width="312" height="164" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  {text(868, 330, "OSBE: Download as Markdown", 20, 700)}
  <rect x="862" y="352" width="256" height="1" fill="#e2e8f0"/>
  {text(868, 394, "OSBE: Copy as Markdown", 20, 700)}
  <rect x="100" y="582" width="350" height="72" rx="12" fill="#ecfeff" stroke="#67e8f9"/>
  {text(130, 626, "No broad host permissions", 24, 800, "#155e75")}
  <rect x="486" y="582" width="350" height="72" rx="12" fill="#f0fdf4" stroke="#86efac"/>
  {text(516, 626, "Runs only when invoked", 24, 800, "#166534")}
"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">{browser_frame(content)}</svg>'


def screenshot_three() -> str:
    content = f"""
  {text(100, 164, "Portable Markdown output", 46, 800)}
  {text(100, 214, "Save articles with front matter, local image assets, and fenced code blocks.", 24, 400, "#475569")}
  <rect x="92" y="272" width="520" height="384" rx="14" fill="#0f172a"/>
  {text(128, 325, "---", 24, 700, "#bfdbfe")}
  {text(128, 363, 'title: "Research notes"', 24, 600, "#e2e8f0")}
  {text(128, 401, 'source: "https://example.dev/..."', 24, 600, "#e2e8f0")}
  {text(128, 439, "---", 24, 700, "#bfdbfe")}
  {text(128, 493, "# Research notes", 30, 800, "#ffffff")}
  {text(128, 543, "```ts", 24, 700, "#93c5fd")}
  {text(128, 581, "return markdown", 24, 600, "#ffffff")}
  {text(128, 619, "```", 24, 700, "#93c5fd")}
  <rect x="708" y="292" width="394" height="112" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
  {text(742, 340, "markdown-clip.md", 26, 800)}
  {text(742, 376, "Clean Markdown with source metadata", 20, 400, "#475569")}
  <rect x="708" y="440" width="394" height="112" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
  {text(742, 488, "assets/image-001.png", 26, 800)}
  {text(742, 524, "Images saved locally in ZIP exports", 20, 400, "#475569")}
"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">{browser_frame(content)}</svg>'


def promo_svg() -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">
  <rect width="440" height="280" fill="#0f172a"/>
  <circle cx="376" cy="42" r="88" fill="#2563eb" opacity="0.34"/>
  <rect x="34" y="38" width="162" height="204" rx="18" fill="#ffffff"/>
  <path d="M78 76h58l24 24v72c0 12-10 22-22 22H78c-12 0-22-10-22-22V98c0-12 10-22 22-22Z" fill="#dbeafe" stroke="#172554" stroke-width="6"/>
  <path d="M136 76v22c0 5 4 9 9 9h15" fill="#bfdbfe"/>
  <path d="M76 141h70" stroke="#2563eb" stroke-width="10" stroke-linecap="round"/>
  <path d="M86 120l15 15-15 15" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  {text(216, 112, "OSBE", 42, 850, "#ffffff")}
  {text(216, 154, "Markdown Clipper", 23, 750, "#bfdbfe")}
  {text(216, 196, "Clip pages into Markdown", 16, 500, "#e2e8f0")}
</svg>"""


def main() -> None:
    OUT.mkdir(exist_ok=True)
    (OUT / "screenshots").mkdir(exist_ok=True)

    svg_to_png(store_icon_svg(), OUT / "store-icon-128.png", strip_alpha=False)
    svg_to_png(screenshot_one(), OUT / "screenshots" / "screenshot-1-popup-1280x800.png", strip_alpha=True)
    svg_to_png(screenshot_two(), OUT / "screenshots" / "screenshot-2-selection-menu-1280x800.png", strip_alpha=True)
    svg_to_png(screenshot_three(), OUT / "screenshots" / "screenshot-3-markdown-output-1280x800.png", strip_alpha=True)
    svg_to_png(promo_svg(), OUT / "small-promo-440x280.png", strip_alpha=True)

    shutil.rmtree(TMP, ignore_errors=True)
    print(f"Generated Chrome Web Store assets in {OUT}")


if __name__ == "__main__":
    main()
