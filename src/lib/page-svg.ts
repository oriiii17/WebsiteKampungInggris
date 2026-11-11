import { ModuleItem, SeedBookPage } from "./types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxChars) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const THEME_PALETTES: Record<
  ModuleItem["coverTheme"],
  { primary: string; dark: string; light: string; accent: string; badgeBg: string }
> = {
  emerald: {
    primary: "#059669",
    dark: "#064e3b",
    light: "#ecfdf5",
    accent: "#f59e0b",
    badgeBg: "#d1fae5",
  },
  amber: {
    primary: "#d97706",
    dark: "#78350f",
    light: "#fffbeb",
    accent: "#059669",
    badgeBg: "#fef3c7",
  },
  sky: {
    primary: "#0284c7",
    dark: "#0c4a6e",
    light: "#f0f9ff",
    accent: "#f59e0b",
    badgeBg: "#e0f2fe",
  },
  rose: {
    primary: "#e11d48",
    dark: "#881337",
    light: "#fff1f2",
    accent: "#059669",
    badgeBg: "#ffe4e6",
  },
  violet: {
    primary: "#7c3aed",
    dark: "#4c1d95",
    light: "#f5f3ff",
    accent: "#d97706",
    badgeBg: "#ede9fe",
  },
};

/**
 * Menghasilkan gambar halaman buku (SVG beresolusi tajam 800x1120) untuk modul bawaan
 * yang dikirim lewat endpoint private signed-URL sehingga tidak ada file PDF di browser.
 */
export function renderSeedBookPageSvg(
  mod: ModuleItem,
  page: SeedBookPage,
  totalPages: number
): string {
  const palette = THEME_PALETTES[mod.coverTheme] || THEME_PALETTES.emerald;

  if (page.kind === "cover") {
    const titleLines = wrapText(page.heading, 22);
    const subLines = wrapText(page.subheading, 42);

    let bulletElements = "";
    let bulletY = 670;
    for (const b of page.bullets) {
      const bLines = wrapText(b, 44);
      bulletElements += `<circle cx="96" cy="${bulletY - 6}" r="7" fill="${palette.accent}" />`;
      for (const line of bLines) {
        bulletElements += `<text x="118" y="${bulletY}" font-family="Arial, sans-serif" font-size="20" fill="#f8fafc">${escapeXml(line)}</text>`;
        bulletY += 28;
      }
      bulletY += 12;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1120" width="800" height="1120">
  <defs>
    <linearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.dark}" />
      <stop offset="100%" stop-color="${palette.primary}" />
    </linearGradient>
  </defs>
  <rect width="800" height="1120" fill="url(#coverGrad)" />
  <circle cx="720" cy="120" r="210" fill="#ffffff" fill-opacity="0.06" />
  <circle cx="80" cy="1020" r="240" fill="#ffffff" fill-opacity="0.05" />
  <rect x="44" y="44" width="712" height="1032" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2" />

  <rect x="80" y="96" width="330" height="42" rx="21" fill="#ffffff" fill-opacity="0.16" />
  <text x="104" y="123" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="#fef3c7" letter-spacing="1.2">KAMPUNG INGGRIS SAPEN</text>

  <text x="80" y="210" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#a7f3d0">${escapeXml(mod.category.toUpperCase())} • LEVEL ${escapeXml(mod.level.toUpperCase())}</text>

  ${titleLines
    .map(
      (line, idx) =>
        `<text x="80" y="${280 + idx * 62}" font-family="Arial, sans-serif" font-weight="bold" font-size="50" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join("\n  ")}

  ${subLines
    .map(
      (line, idx) =>
        `<text x="80" y="${435 + idx * 34}" font-family="Arial, sans-serif" font-size="24" fill="#e2e8f0">${escapeXml(line)}</text>`
    )
    .join("\n  ")}

  <line x1="80" y1="560" x2="720" y2="560" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" />
  <text x="80" y="615" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="${palette.accent}">APA YANG ADA DI MODUL INI:</text>
  ${bulletElements}

  <rect x="80" y="945" width="640" height="84" rx="16" fill="#000000" fill-opacity="0.24" />
  <text x="106" y="982" font-family="Arial, sans-serif" font-size="17" fill="#fef3c7" font-weight="bold">PETUNJUK BACA:</text>
  <text x="106" y="1008" font-family="Arial, sans-serif" font-size="16" fill="#f1f5f9">${escapeXml(
    (page.tip || "Klik panah kanan untuk mulai membaca halaman materi.").slice(0, 72)
  )}</text>
  <text x="690" y="1062" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#cbd5e1">Hal. 1 / ${totalPages}</text>
</svg>`;
  }

  // Interior textbook page
  const headingLines = wrapText(page.heading, 34);
  const subLines = wrapText(page.subheading, 54);

  let yCursor = 255 + (headingLines.length - 1) * 36 + (subLines.length - 1) * 24;
  let bulletsSvg = "";

  page.bullets.forEach((b, index) => {
    const lines = wrapText(b, 50);
    const boxHeight = Math.max(58, lines.length * 27 + 26);
    bulletsSvg += `
    <rect x="68" y="${yCursor}" width="664" height="${boxHeight}" rx="14" fill="${
      index % 2 === 0 ? palette.light : "#f8fafc"
    }" stroke="#e2e8f0" stroke-width="1.5" />
    <circle cx="100" cy="${yCursor + 29}" r="14" fill="${palette.primary}" />
    <text x="100" y="${yCursor + 35}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="#ffffff">${
      index + 1
    }</text>`;

    lines.forEach((ln, lIdx) => {
      bulletsSvg += `<text x="128" y="${
        yCursor + 34 + lIdx * 26
      }" font-family="Arial, sans-serif" font-size="19" fill="#1e293b">${escapeXml(ln)}</text>`;
    });

    yCursor += boxHeight + 14;
  });

  let exampleSvg = "";
  if (page.exampleBox && yCursor < 860) {
    const enLines = wrapText(`"${page.exampleBox.en}"`, 48);
    const idLines = wrapText(`Arti: ${page.exampleBox.id}`, 52);
    const noteLines = page.exampleBox.note ? wrapText(`Catatan: ${page.exampleBox.note}`, 54) : [];
    const exHeight =
      52 + enLines.length * 26 + idLines.length * 24 + (noteLines.length ? noteLines.length * 22 + 12 : 0);

    exampleSvg = `
    <rect x="68" y="${yCursor + 8}" width="664" height="${exHeight}" rx="16" fill="#fffbeb" stroke="#fcd34d" stroke-width="2" />
    <text x="94" y="${yCursor + 38}" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="#b45309" letter-spacing="0.8">CONTOH KALIMAT &amp; PENERAPAN</text>
    ${enLines
      .map(
        (ln, i) =>
          `<text x="94" y="${yCursor + 68 + i * 26}" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#0f172a">${escapeXml(ln)}</text>`
      )
      .join("")}
    ${idLines
      .map(
        (ln, i) =>
          `<text x="94" y="${
            yCursor + 72 + enLines.length * 26 + i * 24
          }" font-family="Arial, sans-serif" font-style="italic" font-size="18" fill="#475569">${escapeXml(ln)}</text>`
      )
      .join("")}
    ${noteLines
      .map(
        (ln, i) =>
          `<text x="94" y="${
            yCursor + 82 + enLines.length * 26 + idLines.length * 24 + i * 22
          }" font-family="Arial, sans-serif" font-size="16" fill="#047857">${escapeXml(ln)}</text>`
      )
      .join("")}
    `;
  }

  const tipLines = page.tip ? wrapText(`Tips Sapen: ${page.tip}`, 60) : [];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1120" width="800" height="1120">
  <rect width="800" height="1120" fill="#ffffff" />
  <rect x="24" y="24" width="752" height="1072" rx="20" fill="none" stroke="#e2e8f0" stroke-width="2" />

  <!-- Top Ribbon -->
  <rect x="24" y="24" width="752" height="72" rx="20" fill="${palette.dark}" />
  <rect x="24" y="64" width="752" height="32" fill="${palette.dark}" />
  <text x="64" y="67" font-family="Arial, sans-serif" font-weight="bold" font-size="17" fill="#ffffff">${escapeXml(
    mod.title.toUpperCase()
  )}</text>
  <text x="736" y="67" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#a7f3d0">Kampung Inggris Sapen</text>

  <!-- Heading -->
  ${headingLines
    .map(
      (ln, idx) =>
        `<text x="68" y="${150 + idx * 36}" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="${palette.dark}">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}

  ${subLines
    .map(
      (ln, idx) =>
        `<text x="68" y="${192 + (headingLines.length - 1) * 36 + idx * 24}" font-family="Arial, sans-serif" font-size="18" fill="#64748b">${escapeXml(ln)}</text>`
    )
    .join("\n  ")}

  <line x1="68" y1="${228 + (headingLines.length - 1) * 36 + (subLines.length - 1) * 24}" x2="732" y2="${
    228 + (headingLines.length - 1) * 36 + (subLines.length - 1) * 24
  }" stroke="${palette.primary}" stroke-opacity="0.3" stroke-width="2" />

  ${bulletsSvg}
  ${exampleSvg}

  <!-- Footer Tip & Page Number -->
  ${
    tipLines.length
      ? `<rect x="68" y="982" width="664" height="62" rx="12" fill="${palette.badgeBg}" />
         ${tipLines
           .slice(0, 2)
           .map(
             (ln, idx) =>
               `<text x="90" y="${1009 + idx * 22}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${palette.dark}">${escapeXml(ln)}</text>`
           )
           .join("")}`
      : ""
  }

  <text x="68" y="1074" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">Materi Eksklusif • Dilarang menyebarluaskan tanpa izin Pengurus</text>
  <text x="732" y="1074" text-anchor="end" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="${palette.dark}">Halaman ${page.pageNumber} dari ${totalPages}</text>
</svg>`;
}
