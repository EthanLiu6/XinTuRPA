import path from "node:path";
import { chromium } from "playwright";
import { ensureDir } from "./fs-util.js";

export async function createBrowser(cfg) {
  const userDataDir = path.resolve(process.cwd(), ".user-data");
  ensureDir(userDataDir);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: cfg.browser,
    headless: Boolean(cfg.headless),
    slowMo: cfg.slowMoMs,
    viewport: { width: 1400, height: 900 }
  });

  const page = context.pages()[0];
  return { context, page };
}

export async function waitForLogin(page, cfg) {
  console.log(`请在浏览器内手动登录（最多等待 ${Math.round(cfg.loginTimeoutMs / 1000)}s）...`);
  console.log(`登录地址: ${cfg.loginUrl}`);

  const deadline = Date.now() + cfg.loginTimeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (isMarketPage(url)) {
      console.log("检测到已登录，进入达人市场页面");
      return true;
    }
    await page.waitForTimeout(1000);
  }

  throw new Error(`登录超时。请在 ${Math.round(cfg.loginTimeoutMs / 1000)}s 内完成登录后重新运行。`);
}

export function isMarketPage(url) {
  return /xingtu\.cn\/ad\/creator\/market/i.test(url);
}

export async function navigateToMarket(page, cfg) {
  const url = page.url();
  if (!isMarketPage(url)) {
    console.log("正在导航到达人搜索页...");
    await page.goto(cfg.marketUrl, {
      waitUntil: "domcontentloaded",
      timeout: cfg.pageLoadTimeoutMs
    });
    await page.waitForTimeout(2000);
  }
}

export async function takeScreenshot(page, cfg, label) {
  const dir = path.resolve(process.cwd(), cfg.screenshotDir || "./output/screenshots");
  ensureDir(dir);
  const timestamp = Date.now();
  const filePath = path.join(dir, `${label}-${timestamp}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`截图已保存: ${filePath}`);
  } catch (e) {
    console.warn(`截图失败: ${e.message}`);
  }
  return filePath;
}
