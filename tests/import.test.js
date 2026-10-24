import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../server/import.js";
import { demoResetPath } from "../server/seed.js";
test("CSV handles BOM, quoted commas, escaped quotes, embedded newlines and booleans", () => {
  const rows = parseCsv(
    '\uFEFFtitle,description,restricted\r\n"Case, one","A ""quoted"" description\nwith newline",false\r\n',
  );
  assert.deepEqual(rows, [
    {
      title: "Case, one",
      description: 'A "quoted" description\nwith newline',
      restricted: false,
    },
  ]);
});
test("CSV rejects malformed quotes, duplicate columns, mismatched rows and invalid boolean", () => {
  for (const csv of [
    "a,a\n1,2",
    "a,b\n1",
    'a\n"unclosed',
    'a\n"quoted"extra',
    "restricted\nyes",
  ])
    assert.throws(() => parseCsv(csv));
});
test("Demo reset target rejects directory traversal and non-database targets", () => {
  assert.ok(demoResetPath("./data/test.sqlite").endsWith("test.sqlite"));
  for (const p of [
    "./data/../outside.sqlite",
    "./data/test.txt",
    "./data/sub/test.sqlite",
    "./data",
  ])
    assert.throws(() => demoResetPath(p));
});
