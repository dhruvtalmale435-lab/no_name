import { openDb } from "../../server/db.js";
import { seed } from "../../server/seed.js";
import { createApp } from "../../server/app.js";
import express from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const folder = mkdtempSync(join(tmpdir(), "institution360-e2e-"));
const db = openDb(join(folder, "demo.sqlite"));
seed(db, "BrowserTestPassword!");
const app = createApp(db, { demo: true });
app.use(express.static("dist"));
app.get("/{*path}", (req, res) => res.sendFile("index.html", { root: "dist" }));
const server = app.listen(3100, "127.0.0.1");
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    rmSync(folder, { recursive: true, force: true });
    process.exit(0);
  }),
);
