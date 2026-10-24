import { fail } from "./service.js";
// RFC 4180-style quoted fields; strict header/row consistency, no silent truncation.
export function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false,
    closed = false;
  const endField = () => {
    row.push(value);
    value = "";
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
      continue;
    }
    if (c === '"') {
      if (value || closed) throw fail(400, "Malformed CSV quote");
      quoted = true;
    } else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endField();
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      if (closed) throw fail(400, "Unexpected text after closing CSV quote");
      value += c;
    }
  }
  if (quoted) throw fail(400, "Unclosed CSV quote");
  endField();
  if (row.some((v) => v !== "")) rows.push(row);
  const headers = rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim());
  if (!headers || !headers.length || new Set(headers).size !== headers.length)
    throw fail(400, "CSV requires unique headers");
  return rows.map((r, index) => {
    if (r.length !== headers.length)
      throw fail(400, `CSV row ${index + 2} does not match headers`);
    const record = Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    if (record.restricted !== undefined) {
      if (!["true", "false", ""].includes(record.restricted))
        throw fail(400, "CSV restricted must be true or false");
      record.restricted = record.restricted === "true";
    }
    if (record.officerId === "") delete record.officerId;
    return record;
  });
}
