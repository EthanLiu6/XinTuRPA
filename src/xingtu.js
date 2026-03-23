import path from "node:path";
import process from "node:process";
import { ensureDir, writeJson } from "./fs-util.js";
import { nowStamp } from "./time.js";

const SEARCH_API_SUBSTR = "/gw/api/gsearch/search_for_author_square";

export function normalizeAuthor(author) {
  const a = author?.attribute_datas ?? {};
  return {
    nick_name: a.nick_name ?? null,
    id: a.id ?? null,
    core_user_id: a.core_user_id ?? null,
    follower: a.follower ?? null,
    city: a.city ?? null,
    province: a.province ?? null,
    price_1_20: a.price_1_20 ?? null,
    price_20_60: a.price_20_60 ?? null,
    price_60: a.price_60 ?? null,
    task_infos: author?.task_infos ?? [],
    raw: author
  };
}

async function tryClickContentFindPeopleTab(page) {
  const tab = page.getByRole("tab", { name: /内容找人/i }).first();
  if (await tab.count()) {
    try {
      await tab.click({ timeout: 2000 });
      return true;
    } catch {
      // ignore
    }
  }
  const byText = page.getByText(/内容找人/i, { exact: false }).first();
  if (await byText.count()) {
    try {
      await byText.click({ timeout: 2000 });
      return true;
    } catch {
      // ignore
    }
  }
  return false;
}

async function findSearchBox(page) {
  return page
    .getByPlaceholder(/按内容关键词找达人|关键词找达人|找达人/i)
    .or(page.locator('input[placeholder*="关键词"]'))
    .or(page.locator('input[placeholder*="找达人"]'))
    .or(page.locator('input[type="search"]'))
    .or(page.locator('input[type="text"]'))
    .first();
}

export async function waitForLoggedInAndMarket({ page, cfg }) {
  const deadline = Date.now() + cfg.loginTimeoutMs;

  // Give user time to login; we don't require any terminal input.
  while (Date.now() < deadline) {
    const u = page.url();
    if (/xingtu\.cn\/ad\/creator\/market/i.test(u)) return;

    await page.waitForTimeout(1000);
  }

  throw new Error(`登录超时（等待 ${Math.round(cfg.loginTimeoutMs / 1000)}s）。请重新运行并在时间内完成手动登录。`);
}

export async function ensureMarketReady({ page, cfg }) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (!/xingtu\.cn\/ad\/creator\/market/i.test(page.url())) {
      try {
        await page.goto(cfg.marketUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      } catch {
        // ignore
      }
    }

    await tryClickContentFindPeopleTab(page);

    const searchBox = await findSearchBox(page);
    try {
      await searchBox.waitFor({ state: "visible", timeout: 5000 });
      return;
    } catch {
      // sometimes needs more time to render
      await page.waitForTimeout(1500);
    }
  }
  throw new Error("进入达人搜索页后，仍未找到可见的搜索框（可能页面结构更新或被风控拦截）。");
}

export function attachSearchCapture(page) {
  let last = null;
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes(SEARCH_API_SUBSTR)) {
      last = {
        url,
        method: req.method(),
        headers: req.headers(),
        postData: req.postData()
      };
    }
  });
  return () => last;
}

export async function searchByKeyword({ page, cfg }) {
  const searchBox = await findSearchBox(page);
  await searchBox.click({ timeout: 20000 });
  await searchBox.fill(cfg.keyword);
  await searchBox.press("Enter");

  const resp = await page.waitForResponse(
    (r) => r.url().includes(SEARCH_API_SUBSTR) && r.status() === 200,
    { timeout: 30000 }
  );
  const json = await resp.json();

  // Let the user see that the UI has reacted (optional).
  // We don't hard-fail on this because the UI may virtualize rendering.
  try {
    await page.waitForTimeout(800);
  } catch {
    // ignore
  }

  return json;
}

export async function fetchMorePages({ context, cfg, getLastSearchRequest, firstResponse, startPage = 2, onProgress }) {
  const last = getLastSearchRequest();
  if (!last) return [];

  const baseHeaders = { ...last.headers };
  delete baseHeaders["content-length"];
  delete baseHeaders["host"];

  let bodyObj = null;
  try {
    bodyObj = last.postData ? JSON.parse(last.postData) : null;
  } catch {
    bodyObj = null;
  }

  const searchSessionId = firstResponse?.extra_data?.search_session_id || null;
  console.log(`翻页参数: search_session_id=${searchSessionId}, startPage=${startPage}`);

  const pages = [];
  let p = startPage;
  while (p <= cfg.maxPages) {
    if (typeof onProgress === "function") {
      onProgress(p);
    }

    let postData = last.postData;
    if (bodyObj && typeof bodyObj === "object") {
      const next = { ...bodyObj };
      if ("page" in next) next.page = p;
      if (next.page_param && typeof next.page_param === "object") {
        next.page_param.page = String(p);
      }
      if (searchSessionId) {
        next.search_session_id = searchSessionId;
      } else {
        delete next.search_session_id;
      }
      postData = JSON.stringify(next);
    }

    await new Promise(resolve => setTimeout(resolve, cfg.requestDelayMs || 1500));

    const resp = await context.request.fetch(last.url, {
      method: last.method || "POST",
      headers: baseHeaders,
      data: postData
    });
    if (!resp.ok()) throw new Error(`翻页请求失败：HTTP ${resp.status()} ${resp.statusText()}`);
    const j = await resp.json();
    pages.push(j);

    const hasMore = Boolean(j?.pagination?.has_more);
    console.log(`第 ${p} 页: has_more=${hasMore}, authors=${j?.authors?.length || 0}`);
    if (!hasMore) break;
    p += 1;
  }
  return pages;
}

export async function exportAuthors({ cfg, keyword, jsonPages }) {
  const authors = [];
  for (const j of jsonPages) {
    const arr = Array.isArray(j?.authors) ? j.authors : [];
    for (const a of arr) authors.push(normalizeAuthor(a));
  }
  const outDir = path.resolve(process.cwd(), cfg.outputDir);
  ensureDir(outDir);
  const outPath = path.join(outDir, `xingtu-authors-${nowStamp()}.json`);
  writeJson(outPath, { keyword, count: authors.length, authors });
  return outPath;
}

export async function saveDebugSnapshot({ page, cfg, label }) {
  const dir = path.resolve(process.cwd(), cfg.screenshotDir || "./output/screenshots");
  ensureDir(dir);
  const file = path.join(dir, `${label}-${nowStamp()}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch {
    // ignore
  }
  return file;
}

