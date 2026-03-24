import express from "express";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { attachApiCapture, waitForSearchPageReady, searchByKeyword, fetchNextPages } from "../search.js";
import { parseAuthors, getSummary, getCsvHeaders, authorToCsvRow } from "../parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

let browserContext = null;
let browserPage = null;

let rpaState = {
  status: "idle",
  loginStatus: "not_logged_in",
  currentTask: null,
  progress: 0,
  error: null
};

let currentSearch = {
  keywords: [],
  results: [],
  allAuthors: [],
  summary: null,
  timestamp: null,
  files: []
};

function getOutputDir() {
  const outDir = path.resolve(process.cwd(), "./output");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  return outDir;
}

function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function saveCsvFile(filePath, authors) {
  const headers = getCsvHeaders();
  const rows = authors.map(a => authorToCsvRow(a).map(c => {
    const str = String(c);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, "\"\"")}"`;
    }
    return str;
  }).join(","));

  const csvContent = [headers.join(","), ...rows].join("\n");
  fs.writeFileSync(filePath, "\uFEFF" + csvContent, "utf8");
}

function isLoggedInUrl(url) {
  if (!url) return false;
  return /xingtu\.cn/i.test(url) && !/sso\.oceanengine\.com\/xingtu\/login/i.test(url);
}

async function checkLoginStatus() {
  if (!browserPage) return;

  try {
    const url = browserPage.url();
    if (isLoggedInUrl(url)) {
      rpaState.loginStatus = "logged_in";
      rpaState.currentTask = "已登录";
      console.log(`[登录] 检测到已登录，URL: ${url}`);
    }
  } catch (e) {
    console.error(`[登录] 检测失败: ${e.message}`);
  }

  if (rpaState.status === "waiting_login" || rpaState.loginStatus !== "logged_in") {
    setTimeout(checkLoginStatus, 2000);
  }
}

router.get("/status", (req, res) => {
  res.json({
    ...rpaState,
    currentSearch: {
      keywords: currentSearch.keywords,
      summary: currentSearch.summary,
      authorCount: currentSearch.allAuthors.length,
      files: currentSearch.files,
      hasResults: currentSearch.allAuthors.length > 0
    }
  });
});

router.post("/start-browser", async (req, res) => {
  try {
    if (browserContext) {
      await browserContext.close();
    }

    const cfg = loadConfig();
    const userDataDir = path.resolve(process.cwd(), ".user-data");
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      channel: cfg.browser,
      headless: false,
      slowMo: cfg.slowMoMs,
      viewport: { width: 1400, height: 900 }
    });

    browserPage = browserContext.pages()[0];

    await browserPage.goto(cfg.loginUrl, { waitUntil: "domcontentloaded" });

    rpaState = {
      status: "waiting_login",
      loginStatus: "not_logged_in",
      currentTask: "等待手动登录",
      progress: 0,
      error: null
    };

    checkLoginStatus();

    res.json({ success: true, message: "浏览器已启动，请在浏览器中完成登录" });
  } catch (e) {
    rpaState.error = e.message;
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/check-login", async (req, res) => {
  if (!browserPage) {
    return res.json({ loggedIn: false, url: null, message: "浏览器未启动" });
  }

  try {
    const url = browserPage.url();
    const loggedIn = isLoggedInUrl(url);
    if (loggedIn) {
      rpaState.loginStatus = "logged_in";
      rpaState.currentTask = "已登录";
    }
    res.json({ loggedIn, url, message: loggedIn ? "已登录" : "未登录" });
  } catch (e) {
    res.json({ loggedIn: false, url: null, error: e.message });
  }
});

router.post("/confirm-login", async (req, res) => {
  if (rpaState.loginStatus !== "logged_in") {
    return res.status(400).json({ success: false, error: "请先完成登录" });
  }

  try {
    await browserPage.goto("https://www.xingtu.cn/ad/creator/market", {
      waitUntil: "domcontentloaded"
    });
    await browserPage.waitForTimeout(2000);
    await waitForSearchPageReady(browserPage, loadConfig());

    rpaState.status = "ready";
    rpaState.currentTask = "准备就绪";

    res.json({ success: true, message: "登录确认成功，可以开始抓取" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/start-crawl", async (req, res) => {
  if (rpaState.loginStatus !== "logged_in") {
    return res.status(400).json({ success: false, error: "请先完成登录" });
  }

  const { keywords } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: "请添加至少一个关键词" });
  }

  try {
    rpaState.status = "running";
    rpaState.progress = 0;
    rpaState.error = null;

    currentSearch = {
      keywords: keywords.map(k => ({ keyword: k.keyword, maxPages: k.maxPages || 3 })),
      results: [],
      allAuthors: [],
      summary: null,
      timestamp: formatTimestamp(),
      files: []
    };

    const cfg = loadConfig();
    const apiCapture = attachApiCapture(browserPage);

    await waitForSearchPageReady(browserPage, cfg);

    const totalKeywords = keywords.length;
    const outDir = getOutputDir();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[抓取开始] 共 ${totalKeywords} 个关键词`);
    console.log("=".repeat(60));

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      rpaState.currentTask = `搜索: ${kw.keyword}`;
      rpaState.progress = Math.round((i / totalKeywords) * 100);

      console.log(`\n[${i + 1}/${totalKeywords}] "${kw.keyword}" (${kw.maxPages || 3}页)`);
      console.log("-".repeat(50));

      try {
        const tempCfg = { ...cfg, keyword: kw.keyword, maxPages: kw.maxPages || 3 };

        if (i === 0) {
          await browserPage.reload({ waitUntil: "domcontentloaded" });
          await waitForSearchPageReady(browserPage, cfg);
        }

        const firstResponse = await searchByKeyword(browserPage, tempCfg);
        
        if (firstResponse && firstResponse.pagination) {
          if (kw.pageSize && kw.pageSize !== 20) {
            firstResponse.pagination.limit = String(kw.pageSize);
          }
        }
        
        const responses = [firstResponse];

        if (firstResponse?.authors?.length > 0) {
          console.log(`  第1页: ${firstResponse.authors.length}条`);
          firstResponse.authors.slice(0, 3).forEach((a, idx) => {
            const attrs = a.attribute_datas || {};
            console.log(`    ${idx + 1}. ${attrs.nick_name || "未知"} | ${attrs.id || "无ID"} | ${formatFollower(attrs.follower)}粉`);
          });
          if (firstResponse.authors.length > 3) {
            console.log(`    ... 还有 ${firstResponse.authors.length - 3} 条`);
          }
        }

        if ((kw.maxPages || 3) > 1) {
          const lastRequest = apiCapture.getLastRequest();
          if (lastRequest) {
            const morePages = await fetchNextPages(browserContext, tempCfg, lastRequest, firstResponse);
            responses.push(...morePages);

            morePages.forEach((pageData, idx) => {
              if (pageData?.authors?.length > 0) {
                console.log(`  第${idx + 2}页: ${pageData.authors.length}条`);
              }
            });
          }
        }

        const authors = parseAuthors(responses, kw.keyword);

        const keywordFileName = `${kw.keyword}-${currentSearch.timestamp}.csv`;
        const keywordFilePath = path.join(outDir, keywordFileName);
        saveCsvFile(keywordFilePath, authors);

        currentSearch.results.push({
          keyword: kw.keyword,
          success: true,
          count: authors.length,
          fileName: keywordFileName,
          authors: authors
        });
        currentSearch.allAuthors.push(...authors);

        console.log(`  -> 保存: ${keywordFileName} (${authors.length}条)`);

      } catch (e) {
        console.error(`  [错误] ${e.message}`);
        currentSearch.results.push({
          keyword: kw.keyword,
          success: false,
          count: 0,
          error: e.message
        });
      }

      if (i < keywords.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    apiCapture.cleanup();

    currentSearch.allAuthors = currentSearch.results.filter(r => r.success).flatMap(r => r.authors);
    currentSearch.summary = getSummary(currentSearch.allAuthors);

    if (currentSearch.keywords.length > 1) {
      const batchFileName = `批量-${currentSearch.keywords.map(k => k.keyword).join("-")}-${currentSearch.timestamp}.csv`;
      const batchFilePath = path.join(outDir, batchFileName);
      saveCsvFile(batchFilePath, currentSearch.allAuthors);
      currentSearch.files.push(batchFileName);
      console.log(`\n[汇总] 批量文件: ${batchFileName}`);
    }

    currentSearch.files = currentSearch.results
      .filter(r => r.success)
      .map(r => r.fileName);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[抓取完成] 共 ${currentSearch.allAuthors.length} 条达人`);
    console.log(`  有报价: ${currentSearch.summary.with_prices} | 有橱窗: ${currentSearch.summary.with_ecommerce}`);
    console.log("=".repeat(60) + "\n");

    rpaState.status = "completed";
    rpaState.progress = 100;
    rpaState.currentTask = "抓取完成";

    res.json({
      success: true,
      summary: currentSearch.summary,
      keywords: currentSearch.keywords,
      results: currentSearch.results,
      files: currentSearch.files,
      authorCount: currentSearch.allAuthors.length
    });

  } catch (e) {
    rpaState.status = "error";
    rpaState.error = e.message;
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/close-browser", async (req, res) => {
  try {
    if (browserContext) {
      await browserContext.close();
      browserContext = null;
      browserPage = null;
    }
    rpaState = {
      status: "idle",
      loginStatus: "not_logged_in",
      currentTask: null,
      progress: 0,
      error: null
    };
    currentSearch = {
      keywords: [],
      results: [],
      allAuthors: [],
      summary: null,
      timestamp: null,
      files: []
    };
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/set-keywords", (req, res) => {
  const { keywords } = req.body;
  if (!keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ success: false, error: "请提供关键词数组" });
  }

  const validKeywords = keywords
    .filter(k => k && k.keyword && typeof k.keyword === "string")
    .map(k => ({
      keyword: k.keyword.trim(),
      maxPages: k.maxPages || 3
    }));

  if (validKeywords.length === 0) {
    return res.status(400).json({ success: false, error: "没有有效的关键词" });
  }

  currentSearch.keywords = validKeywords;
  console.log(`[关键词] 加载 ${validKeywords.length} 个: ${validKeywords.map(k => k.keyword).join(", ")}`);

  res.json({
    success: true,
    message: `已加载 ${validKeywords.length} 个关键词`,
    keywords: validKeywords
  });
});

router.get("/get-keywords", (req, res) => {
  res.json({
    success: true,
    keywords: currentSearch.keywords
  });
});

router.post("/start-from-agent", async (req, res) => {
  const { keywords, autoLaunch = true } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ success: false, error: "请提供关键词数组" });
  }

  const validKeywords = keywords
    .filter(k => k && k.keyword && typeof k.keyword === "string")
    .map(k => ({
      keyword: k.keyword.trim(),
      maxPages: k.maxPages || 3
    }));

  if (validKeywords.length === 0) {
    return res.status(400).json({ success: false, error: "没有有效的关键词" });
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`[Agent请求] 接收 ${validKeywords.length} 个关键词`);
  console.log(`  关键词: ${validKeywords.map(k => k.keyword).join(", ")}`);
  console.log(`  自动启动: ${autoLaunch}`);
  console.log("=".repeat(50) + "\n");

  currentSearch.keywords = validKeywords;

  if (autoLaunch) {
    if (browserContext) {
      await browserContext.close();
    }

    try {
      const cfg = loadConfig();
      const userDataDir = path.resolve(process.cwd(), ".user-data");
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      browserContext = await chromium.launchPersistentContext(userDataDir, {
        channel: cfg.browser,
        headless: false,
        slowMo: cfg.slowMoMs,
        viewport: { width: 1400, height: 900 }
      });

      browserPage = browserContext.pages()[0];

      await browserPage.goto(cfg.loginUrl, { waitUntil: "domcontentloaded" });

      rpaState = {
        status: "waiting_login",
        loginStatus: "not_logged_in",
        currentTask: "等待Agent需求加载，请在浏览器中完成登录",
        progress: 0,
        error: null
      };

      checkLoginStatus();

      res.json({
        success: true,
        message: "浏览器已启动，请在浏览器中完成登录后确认",
        status: "waiting_login",
        keywords: validKeywords,
        nextStep: "POST /api/confirm-login"
      });

    } catch (e) {
      rpaState.error = e.message;
      res.status(500).json({ success: false, error: e.message });
    }
  } else {
    res.json({
      success: true,
      message: "关键词已加载，请手动启动浏览器",
      status: rpaState.status,
      keywords: validKeywords
    });
  }
});

router.get("/authors", (req, res) => {
  res.json({
    success: true,
    authors: currentSearch.allAuthors,
    count: currentSearch.allAuthors.length
  });
});

router.get("/files", (req, res) => {
  res.json({
    success: true,
    files: currentSearch.files.map(f => ({
      name: f,
      url: `/output/${f}`
    })),
    hasResults: currentSearch.allAuthors.length > 0
  });
});

function formatFollower(num) {
  if (!num) return "0";
  const n = parseInt(num, 10);
  if (isNaN(n)) return "0";
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "亿";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

export default router;
