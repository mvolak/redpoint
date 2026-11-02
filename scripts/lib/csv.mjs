// Minimal CSV for the image review sheet. Written with a UTF-8 BOM and ";" separators
// so Czech Excel opens it correctly; parsing accepts ";" or ",".

/** Columns the owner fills in; preserved across harvest re-runs. */
export const OWNER_COLUMNS = ["slot", "approval", "alt_cs", "focal", "credit", "notes"];

export function toCsv(rows) {
  if (rows.length === 0) return "﻿";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v = "") => {
    const s = String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\r\n") + "\r\n";
}

export function parseCsv(input) {
  const src = input.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length ? ";" : ",";
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    records.push(row);
  }
  const [header = [], ...data] = records.filter((r) => r.some((c) => c.trim() !== ""));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
