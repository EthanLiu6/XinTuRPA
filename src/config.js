import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULTS = {
  browser: "msedge",
  headless: false,
  loginUrl: "https://sso.oceanengine.com/xingtu/login?role=1",
  marketUrl: "https://www.xingtu.cn/ad/creator/market",
  loginTimeoutMs: 120000,
  searchMode: "keyword",
  keyword: "",
  authorId: "",
  maxPages: 3,
  slowMoMs: 0,
  outputDir: "./output",
  screenshotDir: "./output/screenshots",
  requireConfirmAfterLogin: false,
  keepBrowserOpen: true,
  keepBrowserOpenMs: 5000,
  requestDelayMs: 2000,
  pageLoadTimeoutMs: 30000,
  searchTimeoutMs: 30000
};

export function loadConfig() {
  const configPath = path.resolve(process.cwd(), "config.json");
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    throw new Error(`读取 config.json 失败：${e?.message || e}`);
  }
  const cfg = { ...DEFAULTS, ...user };
  cfg.browser = String(process.env.BROWSER || cfg.browser || "msedge").trim();
  cfg.keyword = String(cfg.keyword || "").trim();
  cfg.authorId = String(cfg.authorId || "").trim();
  cfg.maxPages = Math.max(1, Number(cfg.maxPages || DEFAULTS.maxPages));
  cfg.loginTimeoutMs = Math.max(10_000, Number(cfg.loginTimeoutMs || 120_000));
  cfg.slowMoMs = Math.max(0, Number(cfg.slowMoMs || 0));
  cfg.requestDelayMs = Math.max(500, Number(cfg.requestDelayMs || 2000));
  cfg.pageLoadTimeoutMs = Math.max(10_000, Number(cfg.pageLoadTimeoutMs || 30000));
  cfg.searchTimeoutMs = Math.max(10_000, Number(cfg.searchTimeoutMs || 30000));
  cfg.keepBrowserOpenMs = Math.max(0, Number(cfg.keepBrowserOpenMs || 0));
  cfg.requireConfirmAfterLogin = Boolean(cfg.requireConfirmAfterLogin);
  cfg.keepBrowserOpen = Boolean(cfg.keepBrowserOpen);
  return cfg;
}

export function validateConfig(cfg) {
  if (cfg.searchMode === "keyword" && !cfg.keyword) {
    throw new Error("关键词搜索模式 (searchMode: keyword) 需要设置 keyword");
  }
  if (cfg.searchMode === "id" && !cfg.authorId) {
    throw new Error("ID搜索模式 (searchMode: id) 需要设置 authorId");
  }
  if (!["keyword", "id"].includes(cfg.searchMode)) {
    throw new Error(`searchMode 必须是 "keyword" 或 "id"，当前为 "${cfg.searchMode}"`);
  }
  return true;
}
