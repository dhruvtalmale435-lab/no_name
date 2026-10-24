import { openDb } from "./db.js";
import { createApp } from "./app.js";
import express from "express";
import { existsSync } from "node:fs";
const production = process.env.NODE_ENV === "production";
const db = openDb();
const app = createApp(db, {
  production,
  demo: process.env.DEMO_MODE === "true",
});
if (production) {
  if (!existsSync("dist/index.html"))
    throw new Error("Run npm run build first");
  app.use(express.static("dist"));
  app.get("/{*path}", (req, res) =>
    res.sendFile("index.html", { root: "dist" }),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(
  Number(process.env.PORT) || 3000,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `BureauSetu listening at http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3000}`,
    ),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
