const API_BASE = '/api';

let keywords = [];
let allAuthors = [];
let pollInterval = null;

const elements = {
  loginStatus: document.getElementById('loginStatus'),
  btnStartBrowser: document.getElementById('btnStartBrowser'),
  btnCheckLogin: document.getElementById('btnCheckLogin'),
  btnConfirmLogin: document.getElementById('btnConfirmLogin'),
  btnCloseBrowser: document.getElementById('btnCloseBrowser'),
  btnStartCrawl: document.getElementById('btnStartCrawl'),
  keywordInput: document.getElementById('keywordInput'),
  pagesInput: document.getElementById('pagesInput'),
  btnAddKeyword: document.getElementById('btnAddKeyword'),
  keywordList: document.getElementById('keywordList'),
  progressContainer: document.getElementById('progressContainer'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  taskInfo: document.getElementById('taskInfo'),
  statTotal: document.getElementById('statTotal'),
  statKeywords: document.getElementById('statKeywords'),
  statWithPrice: document.getElementById('statWithPrice'),
  statWithShop: document.getElementById('statWithShop'),
  resultsList: document.getElementById('resultsList'),
  authorTableBody: document.getElementById('authorTableBody'),
  searchTable: document.getElementById('searchTable'),
  sortField: document.getElementById('sortField'),
  fileList: document.getElementById('fileList')
};

async function api(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateStatus(status, text) {
  elements.loginStatus.className = `status-value status-${status}`;
  elements.loginStatus.textContent = text;
}

function updateButtons(state) {
  elements.btnStartBrowser.disabled = state !== 'idle';
  elements.btnCheckLogin.disabled = state === 'idle';
  elements.btnConfirmLogin.disabled = state !== 'logged_in';
  elements.btnCloseBrowser.disabled = state === 'idle';
  elements.btnStartCrawl.disabled = state !== 'ready' || keywords.length === 0;
}

function renderKeywords() {
  if (keywords.length === 0) {
    elements.keywordList.innerHTML = '<p class="empty-message">暂无关键词</p>';
  } else {
    elements.keywordList.innerHTML = keywords.map((k, i) => `
      <span class="keyword-tag">
        ${k.keyword}
        <span class="pages">${k.maxPages}页</span>
        <span class="remove" onclick="removeKeyword(${i})">&times;</span>
      </span>
    `).join('');
  }
  elements.btnStartCrawl.disabled = rpaState.loginStatus !== 'logged_in' || keywords.length === 0;
}

window.removeKeyword = function(index) {
  keywords.splice(index, 1);
  renderKeywords();
};

function addKeyword(keyword, maxPages = 3) {
  if (!keyword.trim()) return;
  if (keywords.some(k => k.keyword === keyword)) {
    alert('关键词已存在');
    return;
  }
  keywords.push({ keyword: keyword.trim(), maxPages });
  renderKeywords();
}

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  const n = parseInt(num, 10);
  if (isNaN(n)) return num;
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toString();
}

function formatPrice(price) {
  if (!price) return '-';
  const p = parseInt(price, 10);
  if (isNaN(p)) return price;
  if (p >= 10000) return (p / 10000) + '万';
  return p.toString();
}

function renderResults(results) {
  if (!results || results.length === 0) {
    elements.resultsList.innerHTML = '<p class="empty-message">暂无数据</p>';
    return;
  }
  elements.resultsList.innerHTML = results.map(r => `
    <div class="result-item">
      <span class="keyword">${r.keyword}</span>
      <span class="count">
        ${r.success 
          ? `<span class="badge badge-success">${r.count} 条</span>` 
          : `<span class="badge badge-error">失败</span>`
        }
      </span>
    </div>
  `).join('');
}

function renderDashboard(summary) {
  elements.statTotal.textContent = summary?.total_count || 0;
  elements.statKeywords.textContent = keywords.length;
  elements.statWithPrice.textContent = summary?.with_prices || 0;
  elements.statWithShop.textContent = summary?.with_ecommerce || 0;
}

function renderTable(authors) {
  if (!authors || authors.length === 0) {
    elements.authorTableBody.innerHTML = '<tr><td colspan="8" class="empty-message">暂无数据</td></tr>';
    return;
  }

  const search = elements.searchTable.value.toLowerCase();
  const sortField = elements.sortField.value;

  let filtered = authors.filter(a => 
    !search || 
    (a.nick_name && a.nick_name.toLowerCase().includes(search)) ||
    (a.id && a.id.includes(search))
  );

  filtered.sort((a, b) => {
    if (sortField === 'follower') return (b.follower || 0) - (a.follower || 0);
    if (sortField === 'star_index') return (parseFloat(b.star_index) || 0) - (parseFloat(a.star_index) || 0);
    if (sortField === 'interaction_rate') return (parseFloat(b.interaction_rate) || 0) - (parseFloat(a.interaction_rate) || 0);
    return 0;
  });

  elements.authorTableBody.innerHTML = filtered.slice(0, 100).map(a => `
    <tr>
      <td>${a.nick_name || '-'}</td>
      <td style="font-size: 0.85rem; color: #666;">${a.id || '-'}</td>
      <td>${a.follower_str || formatNumber(a.follower)}</td>
      <td>${a.author_type_text || '-'}</td>
      <td>${a.price_summary?.price_1_20 || '-'}</td>
      <td>${a.price_summary?.price_20_60 || '-'}</td>
      <td>${a.price_summary?.price_60 || '-'}</td>
      <td>${a.star_index || '-'}</td>
    </tr>
  `).join('');
}

async function loadFiles() {
  const res = await api('/files');
  if (res.success && res.files.length > 0) {
    elements.fileList.innerHTML = res.files.map(f => `
      <div class="file-item">
        <span class="name">${f.name}</span>
        <div class="meta">
          <span class="size">${(f.size / 1024).toFixed(1)} KB</span>
          <a href="/output/${f.name}" class="download" download>下载</a>
        </div>
      </div>
    `).join('');
  } else {
    elements.fileList.innerHTML = '<p class="empty-message">暂无文件</p>';
  }
}

async function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    const res = await api('/status');
    updateFromState(res);
  }, 1000);
}

function updateFromState(state) {
  if (!state) return;

  if (state.status === 'running') {
    elements.progressContainer.style.display = 'flex';
    elements.progressBar.style.width = state.progress + '%';
    elements.progressText.textContent = state.progress + '%';
    elements.taskInfo.textContent = state.currentTask || '';
  } else {
    elements.progressContainer.style.display = 'none';
  }

  if (state.status === 'completed' && state.results) {
    allAuthors = state.results.allAuthors || [];
    renderDashboard(state.results.summary);
    renderResults(state.results.results);
    renderTable(allAuthors);
    loadFiles();
  }

  updateButtons(state.status);

  switch (state.loginStatus) {
    case 'not_logged_in':
      if (state.status === 'idle') updateStatus('idle', '未启动');
      else if (state.status === 'waiting_login') updateStatus('waiting', '等待登录');
      break;
    case 'logged_in':
      updateStatus('logged', '已登录');
      break;
  }

  if (state.status === 'ready') updateStatus('ready', '准备就绪');
  if (state.status === 'completed') updateStatus('completed', '抓取完成');
  if (state.status === 'error') updateStatus('error', '出错');
}

elements.btnStartBrowser.addEventListener('click', async () => {
  updateStatus('waiting', '启动中...');
  updateButtons('starting');
  const res = await api('/start-browser', { method: 'POST' });
  if (res.success) {
    updateStatus('waiting', '等待登录');
    updateButtons('waiting');
    startPolling();
  } else {
    alert('启动失败: ' + res.error);
    updateStatus('idle', '启动失败');
    updateButtons('idle');
  }
});

elements.btnCheckLogin.addEventListener('click', async () => {
  const res = await api('/check-login', { method: 'POST' });
  if (res.loggedIn) {
    updateStatus('logged', '已登录');
    rpaState.loginStatus = 'logged_in';
    updateButtons('logged_in');
  } else {
    alert('尚未登录，请完成登录后重试');
  }
});

elements.btnConfirmLogin.addEventListener('click', async () => {
  const res = await api('/confirm-login', { method: 'POST' });
  if (res.success) {
    updateStatus('ready', '准备就绪');
    rpaState.loginStatus = 'logged_in';
    updateButtons('ready');
    elements.btnStartCrawl.disabled = keywords.length === 0;
  } else {
    alert('确认失败: ' + res.error);
  }
});

elements.btnCloseBrowser.addEventListener('click', async () => {
  if (pollInterval) clearInterval(pollInterval);
  await api('/close-browser', { method: 'POST' });
  updateStatus('idle', '已关闭');
  updateButtons('idle');
  rpaState = { loginStatus: 'not_logged_in' };
});

elements.btnAddKeyword.addEventListener('click', () => {
  const keyword = elements.keywordInput.value;
  const pages = parseInt(elements.pagesInput.value) || 3;
  addKeyword(keyword, pages);
  elements.keywordInput.value = '';
});

elements.keywordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    elements.btnAddKeyword.click();
  }
});

document.querySelectorAll('.quick-keywords button').forEach(btn => {
  btn.addEventListener('click', () => {
    addKeyword(btn.dataset.keyword, 3);
  });
});

elements.searchTable.addEventListener('input', () => renderTable(allAuthors));
elements.sortField.addEventListener('change', () => renderTable(allAuthors));

elements.btnStartCrawl.addEventListener('click', async () => {
  if (keywords.length === 0) {
    alert('请先添加关键词');
    return;
  }

  const res = await api('/start-crawl', {
    method: 'POST',
    body: JSON.stringify({ keywords })
  });

  if (res.success) {
    allAuthors = res.results?.flatMap(r => r.authors) || [];
    renderDashboard(res.summary);
    renderResults(res.results);
    renderTable(allAuthors);
    loadFiles();
  } else {
    alert('抓取失败: ' + res.error);
  }
});

loadFiles();
