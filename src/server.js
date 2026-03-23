import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import apiRouter from "./routes/api.js";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api", apiRouter);

app.use("/output", express.static(path.join(process.cwd(), "./output")));

const distPath = path.join(process.cwd(), "./dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  星图达人RPA系统`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`========================================`);
  if (!fs.existsSync(distPath)) {
    console.log(`  [提示] Vue开发模式需先运行: npm run dev`);
    console.log(`  或构建生产版本: npm run build`);
  }
  console.log(`  按 Ctrl+C 停止服务器`);
});
