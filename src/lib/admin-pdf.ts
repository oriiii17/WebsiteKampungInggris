type PdfSection = { title: string; headers: string[]; rows: unknown[][] };

export function createAdminPdf(title: string, sections: PdfSection[]) {
  const printedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  const lines = [title, `Dicetak ${printedAt}`, ...sections.flatMap((section) => ["", section.title, section.headers.join(" | "), ...section.rows.map((row) => row.map((value) => String(value ?? "").replace(/\s+/g, " ")).join(" | "))])];
  const landscape = Math.max(0, ...sections.map((section) => section.headers.length)) > 6;
  const pageWidth = landscape ? 842 : 612;
  const pageHeight = landscape ? 595 : 842;
  const escapePdf = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?").replace(/([\\()])/g, "\\$1");
  const pages: string[][] = [];
  for (let index = 0; index < lines.length || index === 0; index += 46) pages.push(lines.slice(index, index + 46));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [" + pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ") + `] /Count ${pages.length} >>`];
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = ["BT", "/F1 9 Tf", `42 ${pageHeight - 48} Td`, ...page.flatMap((line, lineIndex) => [`(${escapePdf(line).slice(0, landscape ? 130 : 100)}) Tj`, lineIndex < page.length - 1 ? "0 -12 Td" : ""]), "ET"].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  let offset = new TextEncoder().encode(chunks[0]).length;
  objects.forEach((object, index) => { offsets.push(offset); const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`; chunks.push(chunk); offset += new TextEncoder().encode(chunk).length; });
  const xrefOffset = offset;
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((entry) => `${String(entry).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new TextEncoder().encode(chunks.join(""));
}
