import { waitForEnter } from "./cli.js";

const SEARCH_API_PATH = "/gw/api/gsearch/search_for_author_square";
const ID_SEARCH_API_PATH = "/gw/api/gsearch/search_intent_authors";

export function attachApiCapture(page) {
  let capturedRequests = [];

  const handler = (request) => {
    const url = request.url();
    if (url.includes(SEARCH_API_PATH) || url.includes(ID_SEARCH_API_PATH)) {
      capturedRequests.push({
        url: url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    }
  };

  page.on("request", handler);

  return {
    cleanup: () => page.off("request", handler),
    getLastRequest: () => capturedRequests[capturedRequests.length - 1] || null,
    getAllRequests: () => [...capturedRequests]
  };
}

async function findContentFinderTab(page) {
  const selectors = [
    { name: "tab-content-finder", text: /内容找人/i },
    { name: "tab-creator", text: /创作者/i }
  ];

  for (const sel of selectors) {
    try {
      const element = page.locator(`[class*="${sel.name}"]`).filter({ hasText: sel.text }).first();
      if (await element.count() > 0) {
        await element.click({ timeout: 2000 });
        await page.waitForTimeout(1000);
        console.log(`已点击: ${sel.text}`);
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

async function findSearchInput(page) {
  const selectors = [
    { type: "placeholder", value: /关键词找达人|按内容关键词找达人|找达人/i },
    { type: "placeholder", value: /输入关键词/i },
    { type: "placeholder", value: /搜索/i },
    { type: "class", value: 'input[type="text"]' },
    { type: "class", value: 'input[type="search"]' }
  ];

  for (const sel of selectors) {
    try {
      let locator;
      if (sel.type === "placeholder") {
        locator = page.locator(`input[placeholder*="${sel.value.source || sel.value}"]`).first();
      } else {
        locator = page.locator(sel.value).first();
      }

      if (await locator.count() > 0 && await locator.isVisible()) {
        return locator;
      }
    } catch {
      // try next
    }
  }

  throw new Error("未找到搜索输入框");
}

async function findNextPageButton(page) {
  const selectors = [
    { text: /下一页/i },
    { text: /下页/i },
    { ariaLabel: /下一页/i },
    { class: /next/i },
  ];

  for (const sel of selectors) {
    try {
      let locator;
      if (sel.text) {
        locator = page.locator("button", { hasText: sel.text }).or(page.locator(`[class*="${sel.text.source || sel.text}"]`));
      } else if (sel.ariaLabel) {
        locator = page.locator(`button[aria-label*="${sel.ariaLabel}"]`);
      } else if (sel.class) {
        locator = page.locator(`[class*="${sel.class}"]`);
      }
      locator = locator.first();
      
      if (await locator.count() > 0 && await locator.isVisible()) {
        const isDisabled = await locator.getAttribute("disabled");
        if (isDisabled === null) {
          return locator;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function waitForSearchPageReady(page, cfg) {
  console.log("等待搜索页面加载...");

  await findContentFinderTab(page);

  const deadline = Date.now() + cfg.pageLoadTimeoutMs;
  while (Date.now() < deadline) {
    try {
      const input = await findSearchInput(page);
      if (await input.isVisible()) {
        console.log("搜索框已就绪");
        return input;
      }
    } catch {
      // not ready yet
    }
    await page.waitForTimeout(1500);
  }

  throw new Error("搜索页面加载超时");
}

export async function searchByKeyword(page, cfg) {
  console.log(`正在搜索关键词: ${cfg.keyword}`);

  const searchInput = await findSearchInput(page);
  await searchInput.click();
  await searchInput.fill(cfg.keyword);

  await page.waitForTimeout(500);

  const searchButton = page.locator("button").filter({ hasText: /搜索/i }).first();
  if (await searchButton.count() > 0) {
    await searchButton.click();
  } else {
    await searchInput.press("Enter");
  }

  console.log("等待搜索结果...");
  const response = await page.waitForResponse(
    (r) => r.url().includes(SEARCH_API_PATH) && r.status() === 200,
    { timeout: cfg.searchTimeoutMs }
  );

  const data = await response.json();
  console.log(`第1页获取到 ${data?.authors?.length || 0} 条数据`);
  console.log(`  pagination: page=${data.pagination?.page}, limit=${data.pagination?.limit}, has_more=${data.pagination?.has_more}, total=${data.pagination?.total_count}`);
  
  const req = response.request();
  const reqBody = req.postData();
  console.log(`  请求体: ${reqBody}`);

  return data;
}

export async function searchById(page, cfg) {
  console.log(`正在搜索达人ID: ${cfg.authorId}`);

  const searchInput = await findSearchInput(page);
  await searchInput.click();
  await searchInput.fill(cfg.authorId);

  await page.waitForTimeout(500);
  await searchInput.press("Enter");

  console.log("等待搜索结果...");
  const response = await page.waitForResponse(
    (r) => (r.url().includes(ID_SEARCH_API_PATH) || r.url().includes(SEARCH_API_PATH)) && r.status() === 200,
    { timeout: cfg.searchTimeoutMs }
  );

  const data = await response.json();
  console.log(`获取到 ${data?.authors?.length || 0} 条数据`);

  return data;
}

export async function fetchNextPages(context, cfg, firstRequest, firstResponse) {
  if (!firstRequest || cfg.maxPages <= 1) {
    return [];
  }

  const totalPages = cfg.maxPages;
  console.log(`\n开始API翻页（目标 ${totalPages - 1} 页）...`);
  
  const seenIds = new Set();
  if (firstResponse?.authors) {
    for (const author of firstResponse.authors) {
      const id = author.attribute_datas?.id || author.star_id || author.attribute_datas?.core_user_id;
      if (id) seenIds.add(id);
    }
    console.log(`第1页 ${firstResponse.authors.length} 条数据, 已记录 ${seenIds.size} 个唯一ID`);
  }

  const pages = [];
  let newAuthorsTotal = 0;

  for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
    console.log(`\n请求第 ${pageNum} 页...`);

    await new Promise(resolve => setTimeout(resolve, cfg.requestDelayMs || 2000));

    try {
      const result = await fetchSinglePage(context, firstRequest, pageNum, cfg, seenIds);
      
      if (!result) {
        console.log(`第 ${pageNum} 页请求失败，停止翻页`);
        break;
      }

      const json = result.json;
      const rawAuthors = json?.authors || [];
      const newAuthors = rawAuthors.filter(a => {
        const id = a.attribute_datas?.id || a.star_id || a.attribute_datas?.core_user_id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          return true;
        }
        return false;
      });

      const respPage = json?.pagination?.page;
      const hasMore = Boolean(json?.pagination?.has_more);

      console.log(`第 ${pageNum} 页响应: page=${respPage}, has_more=${hasMore}, raw=${rawAuthors.length}, new=${newAuthors.length}`);

      if (newAuthors.length > 0) {
        pages.push({ ...json, authors: newAuthors });
        newAuthorsTotal += newAuthors.length;
      }

      if (!hasMore) {
        console.log(`停止翻页: has_more=false`);
        break;
      }

    } catch (e) {
      console.warn(`第 ${pageNum} 页请求异常: ${e.message}`);
      break;
    }
  }

  console.log(`\n翻页完成: 新增 ${pages.length} 页, 共 ${newAuthorsTotal} 条新数据`);
  return pages;
}

async function fetchSinglePage(context, firstRequest, pageNum, cfg, seenIds) {
  let requestBody = null;
  try {
    requestBody = firstRequest.postData ? JSON.parse(firstRequest.postData) : null;
  } catch {
    return null;
  }

  if (!requestBody) return null;

  const nextBody = buildNextPageBody(requestBody, pageNum, cfg.pageSize, null);
  const postData = JSON.stringify(nextBody);

  const baseHeaders = { ...firstRequest.headers };
  delete baseHeaders["content-length"];
  delete baseHeaders["host"];
  delete baseHeaders["Content-Length"];

  try {
    const resp = await context.request.fetch(firstRequest.url, {
      method: firstRequest.method || "POST",
      headers: baseHeaders,
      data: postData
    });

    if (!resp.ok()) {
      console.warn(`  API请求失败: HTTP ${resp.status()}`);
      return null;
    }

    const json = await resp.json();
    return { json };
  } catch (e) {
    console.warn(`  请求异常: ${e.message}`);
    return null;
  }
}

async function tryApiFetch(context, cfg, firstRequest, firstResponse, startPage) {
  console.log(`\n尝试API翻页 (从第${startPage}页开始)...`);

  const baseHeaders = { ...firstRequest.headers };
  delete baseHeaders["content-length"];
  delete baseHeaders["host"];
  delete baseHeaders["Content-Length"];

  let requestBody = null;
  try {
    requestBody = firstRequest.postData ? JSON.parse(firstRequest.postData) : null;
  } catch {
    return [];
  }

  if (!requestBody) return [];

  const requestUrl = firstRequest.url;
  console.log(`API请求URL: ${requestUrl}`);

  const searchSessionId = firstResponse?.extra_data?.search_session_id || null;
  console.log(`search_session_id: ${searchSessionId}`);

  const seenIds = new Set();
  if (firstResponse?.authors) {
    for (const author of firstResponse.authors) {
      const id = author.attribute_datas?.id || author.star_id || author.attribute_datas?.core_user_id;
      if (id) seenIds.add(id);
    }
  }

  const pages = [];
  const totalPages = cfg.maxPages;

  for (let pageNum = startPage; pageNum <= totalPages; pageNum++) {
    const nextBody = buildNextPageBody(requestBody, pageNum, cfg.pageSize, searchSessionId);
    const postData = JSON.stringify(nextBody);

    console.log(`  请求第 ${pageNum} 页, body: page=${nextBody.page_param?.page}, search_session_id=${nextBody.search_session_id || 'N/A'}`);

    await new Promise(resolve => setTimeout(resolve, cfg.requestDelayMs || 2000));

    try {
      const resp = await context.request.fetch(requestUrl, {
        method: firstRequest.method || "POST",
        headers: baseHeaders,
        data: postData
      });

      if (!resp.ok()) {
        console.warn(`  API请求失败: HTTP ${resp.status()}`);
        break;
      }

      const json = await resp.json();
      const rawAuthors = json?.authors || [];

      const newAuthors = [];
      for (const author of rawAuthors) {
        const id = author.attribute_datas?.id || author.star_id || author.attribute_datas?.core_user_id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          newAuthors.push(author);
        }
      }

      const respPage = json?.pagination?.page;
      const hasMore = Boolean(json?.pagination?.has_more);

      console.log(`  第 ${pageNum} 页: page=${respPage}, has_more=${hasMore}, raw=${rawAuthors.length}, new=${newAuthors.length}`);

      if (newAuthors.length > 0) {
        pages.push({ ...json, authors: newAuthors });
      }

      if (!hasMore) break;

    } catch (e) {
      console.warn(`  API请求异常: ${e.message}`);
      break;
    }
  }

  return pages;
}

function buildNextPageBody(requestBody, pageNum, pageSize, searchSessionId) {
  const next = JSON.parse(JSON.stringify(requestBody));

  if (next.page_param && typeof next.page_param === "object") {
    next.page_param = { ...next.page_param, page: String(pageNum) };
    if (pageSize) {
      next.page_param.limit = String(pageSize);
    }
  } else if (next.page !== undefined) {
    next.page = String(pageNum);
    if (pageSize) {
      next.limit = String(pageSize);
    }
  } else {
    next.page_param = { page: String(pageNum), limit: pageSize ? String(pageSize) : "20" };
  }

  if (searchSessionId) {
    next.search_session_id = searchSessionId;
  } else {
    delete next.search_session_id;
  }

  return next;
}

export async function handleLoginConfirmation(cfg) {
  if (cfg.requireConfirmAfterLogin) {
    console.log("按回车键继续...");
    await waitForEnter("");
  }
}
