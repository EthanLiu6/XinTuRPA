import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { loadConfig, validateConfig } from "./config.js";
import { createBrowser, waitForLogin, navigateToMarket, takeScreenshot } from "./browser.js";
import { attachApiCapture, waitForSearchPageReady, searchByKeyword, searchById, fetchNextPages, handleLoginConfirmation } from "./search.js";
import { parseAuthors } from "./parser.js";
import { saveAuthors, saveRawResponse, saveBatchResults } from "./storage.js";

function loadKeywordsConfig() {
  const configPath = path.resolve(process.cwd(), "config/keywords.json");
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

async function searchSingleKeyword(context, page, cfg, keyword, maxPages, apiCapture) {
  const tempCfg = { ...cfg, keyword, maxPages };

  let firstResponse;
  try {
    if (cfg.searchMode === "keyword") {
      firstResponse = await searchByKeyword(page, tempCfg);
    } else {
      firstResponse = await searchById(page, tempCfg);
    }
  } catch (e) {
    throw new Error(`搜索失败: ${e.message}`);
  }

  if (!firstResponse || !firstResponse.authors || firstResponse.authors.length === 0) {
    console.log(`  未获取到数据`);
    return { keyword, success: true, authors: [] };
  }

  const allResponses = [firstResponse];

  if (maxPages > 1) {
    const lastRequest = apiCapture.getLastRequest();
    if (lastRequest) {
      const morePages = await fetchNextPages(context, cfg, lastRequest, firstResponse);
      allResponses.push(...morePages);
    }
  }

  const authors = parseAuthors(allResponses);
  return { keyword, success: true, authors, rawResponses: allResponses };
}

async function main() {
  console.log("=".repeat(50));
  console.log("星图达人数据抓取工具");
  console.log("=".repeat(50));

  const cfg = loadConfig();
  const keywordsConfig = loadKeywordsConfig();

  const keywordsToSearch = [];
  const results = [];

  if (keywordsConfig && keywordsConfig.keywords) {
    const enabledKeywords = keywordsConfig.keywords.filter(k => k.enabled);
    if (enabledKeywords.length > 0) {
      console.log("\n从 keywords.json 加载到以下关键词:");
      for (const k of enabledKeywords) {
        console.log(`  - ${k.keyword} (最多 ${k.maxPages} 页)${k.remark ? ` - ${k.remark}` : ""}`);
      }
      keywordsToSearch.push(...enabledKeywords);
    }
  }

  if (cfg.keyword && keywordsToSearch.length === 0) {
    keywordsToSearch.push({
      keyword: cfg.keyword,
      maxPages: cfg.maxPages,
      remark: "来自 config.json"
    });
  }

  if (keywordsToSearch.length === 0) {
    console.error("错误: 没有找到要搜索的关键词");
    console.log("\n请在 config.json 或 config/keywords.json 中设置关键词");
    process.exitCode = 1;
    return;
  }

  const useBatchMode = keywordsToSearch.length > 1;
  const globalDelay = keywordsConfig?.global?.delayBetweenKeywords || 3000;

  console.log("\n当前配置:");
  console.log(`  浏览器: ${cfg.browser}`);
  console.log(`  搜索模式: ${cfg.searchMode}`);
  console.log(`  关键词数: ${keywordsToSearch.length}`);
  console.log(`  输出目录: ${cfg.outputDir}`);
  if (useBatchMode) {
    console.log(`  批量模式: 开启`);
    console.log(`  关键词间隔: ${globalDelay}ms`);
  }
  console.log("");

  let context = null;
  let page = null;

  try {
    console.log("正在启动浏览器...");
    const browser = await createBrowser(cfg);
    context = browser.context;
    page = browser.page;

    await navigateToMarket(page, cfg);

    try {
      await waitForLogin(page, cfg);
    } catch (e) {
      await takeScreenshot(page, cfg, "login-timeout");
      throw e;
    }

    await handleLoginConfirmation(cfg);

    await takeScreenshot(page, cfg, "before-search");

    try {
      await waitForSearchPageReady(page, cfg);
    } catch (e) {
      await takeScreenshot(page, cfg, "search-page-error");
      throw new Error(`搜索页面准备失败: ${e.message}`);
    }

    const apiCapture = attachApiCapture(page);

    for (let i = 0; i < keywordsToSearch.length; i++) {
      const item = keywordsToSearch[i];
      console.log(`\n[${i + 1}/${keywordsToSearch.length}] 搜索关键词: ${item.keyword}`);

      if (i > 0 && globalDelay > 0) {
        console.log(`  等待 ${globalDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, globalDelay));
      }

      try {
        const result = await searchSingleKeyword(context, page, cfg, item.keyword, item.maxPages, apiCapture);
        results.push(result);
        console.log(`  获取到 ${result.authors?.length || 0} 条数据`);
      } catch (e) {
        console.error(`  错误: ${e.message}`);
        results.push({ keyword: item.keyword, success: false, authors: [], error: e.message });
      }
    }

    apiCapture.cleanup();

    if (useBatchMode) {
      const outputFiles = saveBatchResults(results, cfg);
    } else if (results.length > 0) {
      const result = results[0];
      if (result.authors && result.authors.length > 0) {
        const searchInfo = {
          searchMode: cfg.searchMode,
          keyword: result.keyword,
          authorId: cfg.authorId || null
        };
        saveAuthors(result.authors, cfg, searchInfo);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("抓取完成!");
    console.log("=".repeat(50));

    if (useBatchMode) {
      console.log("\n各关键词结果:");
      for (const r of results) {
        const status = r.success ? "✓" : "✗";
        const count = r.authors?.length || 0;
        console.log(`  ${status} ${r.keyword}: ${count} 条${r.error ? ` (${r.error})` : ""}`);
      }
    }

  } catch (e) {
    console.error("\n错误:", e.message);
    if (page) {
      await takeScreenshot(page, cfg, "error").catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    if (context && cfg.keepBrowserOpen) {
      console.log(`\n浏览器将在 ${cfg.keepBrowserOpenMs / 1000} 秒后关闭...`);
      await page.waitForTimeout(cfg.keepBrowserOpenMs);
      await context.close().catch(() => {});
    } else if (context) {
      await context.close().catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err?.stack || err);
  process.exitCode = 1;
});
