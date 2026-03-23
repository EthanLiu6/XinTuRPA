<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <h1>星图达人抓取</h1>
        <span class="header-desc">抖音星图平台达人数据采集工具</span>
      </div>
      <div class="header-right">
        <div class="status-indicator">
          <span :class="['status-dot', statusClass]"></span>
          <span class="status-text">{{ statusText }}</span>
        </div>
      </div>
    </header>

    <div class="main-layout">
      <aside class="left-panel">
        <section class="panel glow-border">
          <div class="panel-header">
            <span class="panel-title">登录控制</span>
            <span :class="['status-badge', statusClass]">{{ statusText }}</span>
          </div>
          <div class="login-controls">
            <button class="btn btn-primary btn-glow" @click="handleStartBrowser" :disabled="status !== 'idle'">
              <span class="btn-icon">🚀</span>
              {{ status === 'idle' ? '启动浏览器' : '浏览器运行中' }}
            </button>
            <button class="btn btn-outline" @click="handleCheckLogin" :disabled="status === 'idle'">
              <span class="btn-icon">🔐</span>检查登录
            </button>
            <button class="btn btn-success btn-glow" @click="handleConfirmLogin" :disabled="loginStatus !== 'logged_in'">
              <span class="btn-icon">✓</span>确认登录
            </button>
          </div>
          <p class="task-info" v-if="currentTask">{{ currentTask }}</p>
        </section>

        <section class="panel glow-border">
          <div class="panel-header">
            <span class="panel-title">抓取参数</span>
          </div>
          <div class="param-grid">
            <div class="param-item">
              <label class="param-label">抓取页数</label>
              <div class="param-input-wrap">
                <input v-model.number="pagesInput" type="number" min="1" max="50" class="param-input" />
              </div>
            </div>
          </div>
        </section>

        <section class="panel glow-border">
          <div class="panel-header">
            <span class="panel-title">关键词配置</span>
          </div>
          <div class="keyword-input-group">
            <input v-model="keywordInput" placeholder="输入关键词" @keyup.enter="addKeyword" class="keyword-input" />
            <button class="btn btn-primary" @click="addKeyword">添加</button>
          </div>
          <div class="quick-tags">
            <span class="quick-label">快捷添加:</span>
            <button v-for="q in quickKeywords" :key="q" class="tag" @click="addQuickKeyword(q)">{{ q }}</button>
          </div>
          <div class="keyword-list" v-if="keywords.length > 0">
            <div v-for="(kw, i) in keywords" :key="kw.keyword" class="keyword-item">
              <div class="kw-main">
                <span class="kw-tag" :style="{ background: getKeywordColor(i) }">{{ kw.keyword }}</span>
                <span class="kw-params">{{ kw.maxPages }}页</span>
              </div>
              <button class="kw-remove" @click="removeKeyword(i)">×</button>
            </div>
          </div>
        </section>

        <section class="panel glow-border gradient-panel">
          <button class="btn btn-large btn-block btn-primary btn-glow pulse" @click="handleStartCrawl" :disabled="!canStartCrawl || status === 'running'">
            <span class="btn-icon-lg">{{ status === 'running' ? '⏳' : '🎯' }}</span>
            {{ status === 'running' ? '抓取中...' : '开始抓取' }}
          </button>
          <div class="progress-bar" v-if="status === 'running'">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-info" v-if="status === 'running'">
            <span>{{ progress.toFixed(0) }}%</span>
          </div>
        </section>

        <section class="panel glow-border" v-if="hasResults">
          <div class="panel-header">
            <span class="panel-title">数据统计</span>
          </div>
          <div class="stats-grid">
            <div class="stat-card stat-primary">
              <span class="stat-icon">👤</span>
              <span class="stat-value">{{ authorCount }}</span>
              <span class="stat-label">达人总数</span>
            </div>
            <div class="stat-card stat-success">
              <span class="stat-icon">💰</span>
              <span class="stat-value">{{ summary?.with_prices || 0 }}</span>
              <span class="stat-label">有报价</span>
            </div>
            <div class="stat-card stat-warning">
              <span class="stat-icon">🛒</span>
              <span class="stat-value">{{ summary?.with_ecommerce || 0 }}</span>
              <span class="stat-label">电商达人</span>
            </div>
            <div class="stat-card stat-info">
              <span class="stat-icon">🔖</span>
              <span class="stat-value">{{ keywords.length }}</span>
              <span class="stat-label">关键词</span>
            </div>
          </div>
        </section>
      </aside>

      <main class="right-panel">
        <section class="panel glow-border" v-if="hasResults">
          <div class="panel-header">
            <span class="panel-title">达人列表</span>
            <span class="panel-count">{{ filteredAuthors.length }} 条</span>
          </div>
          <div class="table-toolbar">
            <div class="toolbar-left">
              <div class="keyword-filter">
                <button 
                  class="filter-btn" 
                  :class="{ active: selectedKeyword === '' }"
                  @click="selectedKeyword = ''"
                >
                  全部
                </button>
                <button 
                  v-for="(kw, i) in keywords" 
                  :key="kw.keyword"
                  class="filter-btn"
                  :class="{ active: selectedKeyword === kw.keyword }"
                  :style="selectedKeyword === kw.keyword ? { background: getKeywordColor(i), borderColor: getKeywordColor(i) } : {}"
                  @click="selectedKeyword = kw.keyword"
                >
                  {{ kw.keyword }}
                </button>
              </div>
            </div>
            <div class="toolbar-right">
              <input v-model="searchQuery" placeholder="搜索昵称、ID..." class="search-input" />
              <select v-model="sortField" class="sort-select">
                <option value="follower">粉丝数</option>
                <option value="star_index">星图指数</option>
                <option value="interaction_rate">互动率</option>
                <option value="cpm_20_60">CPM(21-60s)</option>
                <option value="price_20_60">报价(21-60s)</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>关键词</th>
                  <th>昵称</th>
                  <th>粉丝</th>
                  <th>地区</th>
                  <th>互动率</th>
                  <th>1-20s报价</th>
                  <th>21-60s报价</th>
                  <th>60s+报价</th>
                  <th>CPM(1-20s)</th>
                  <th>CPM(21-60s)</th>
                  <th>CPM(60s+)</th>
                  <th>星图指数</th>
                  <th>转化指数</th>
                  <th>电商等级</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in filteredAuthors" :key="a.id" class="author-row">
                  <td>
                    <span class="keyword-badge" :style="{ background: getKeywordColor(getKeywordIndex(a.keyword)) }">
                      {{ a.keyword }}
                    </span>
                  </td>
                  <td class="td-name">
                    <div class="name-cell">
                      <img v-if="a.avatar_uri" :src="a.avatar_uri" class="avatar" @error="handleAvatarError" />
                      <span>{{ a.nick_name || '-' }}</span>
                    </div>
                  </td>
                  <td class="td-num">{{ a.follower_str }}</td>
                  <td>{{ a.region || '-' }}</td>
                  <td class="td-rate">{{ a.interaction_rate_str }}</td>
                  <td class="td-price">{{ a.price_1_20 || '-' }}</td>
                  <td class="td-price">{{ a.price_20_60 || '-' }}</td>
                  <td class="td-price">{{ a.price_60 || '-' }}</td>
                  <td class="td-cpm">{{ a.prospective_1_20_cpm || '-' }}</td>
                  <td class="td-cpm highlight">{{ a.prospective_20_60_cpm || '-' }}</td>
                  <td class="td-cpm">{{ a.prospective_60_cpm || '-' }}</td>
                  <td class="td-index">{{ a.star_index || '-' }}</td>
                  <td class="td-index">{{ a.link_convert_index || '-' }}</td>
                  <td class="td-level">{{ a.ecom_level || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel glow-border" v-if="hasResults">
          <div class="panel-header">
            <span class="panel-title">关键词结果</span>
          </div>
          <div class="result-grid">
            <div v-for="r in results" :key="r.keyword" class="result-card" :style="{ borderLeftColor: getKeywordColor(results.indexOf(r)) }">
              <div class="result-header">
                <span class="result-kw">{{ r.keyword }}</span>
                <span :class="['badge', r.success ? 'badge-success' : 'badge-error']">
                  {{ r.success ? r.count + '条' : '失败' }}
                </span>
              </div>
              <div class="result-stats" v-if="r.success">
                <div class="result-stat">
                  <span class="rs-label">有报价</span>
                  <span class="rs-value">{{ getKeywordStat(r, 'with_prices') }}</span>
                </div>
                <div class="result-stat">
                  <span class="rs-label">电商</span>
                  <span class="rs-value">{{ getKeywordStat(r, 'with_ecommerce') }}</span>
                </div>
                <div class="result-stat">
                  <span class="rs-label">平均粉丝</span>
                  <span class="rs-value">{{ getKeywordStat(r, 'avg_followers') }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel glow-border" v-if="hasResults && files.length > 0">
          <div class="panel-header">
            <span class="panel-title">数据下载</span>
          </div>
          <div class="file-list">
            <a v-for="f in files" :key="f" :href="'/output/' + f" class="file-item" download>
              <span class="file-icon">📄</span>
              <span class="file-name">{{ f }}</span>
              <span class="btn-download">下载CSV</span>
            </a>
          </div>
        </section>

        <section class="panel empty-panel glow-border" v-if="!hasResults && status !== 'running'">
          <div class="empty-content">
            <div class="empty-icon">🔍</div>
            <p class="empty-title">暂无数据</p>
            <p class="empty-tip">完成登录后，添加关键词开始抓取</p>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as api from './api/index.js'

const status = ref('idle')
const loginStatus = ref('not_logged_in')
const currentTask = ref('')
const progress = ref(0)

const keywords = ref([])
const results = ref([])
const allAuthors = ref([])
const summary = ref(null)
const files = ref([])

const keywordInput = ref('')
const pagesInput = ref(3)
const searchQuery = ref('')
const sortField = ref('follower')
const selectedKeyword = ref('')

const quickKeywords = ['健身', '美食', '美妆', '母婴', '数码', '旅游', '教育', '家居']

const keywordColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

function getKeywordColor(index) {
  return keywordColors[index % keywordColors.length]
}

function getKeywordIndex(keyword) {
  return keywords.value.findIndex(k => k.keyword === keyword)
}

function handleAvatarError(e) {
  e.target.style.display = 'none'
}

let pollTimer = null

const statusClass = computed(() => {
  const map = { 
    idle: 'dot-default', 
    waiting_login: 'dot-warning', 
    logged_in: 'dot-success', 
    ready: 'dot-info', 
    running: 'dot-primary', 
    completed: 'dot-success', 
    error: 'dot-error' 
  }
  return map[status.value] || 'dot-default'
})

const statusText = computed(() => {
  const map = {
    idle: '未启动',
    waiting_login: '等待登录',
    logged_in: '已登录',
    ready: '准备就绪',
    running: '抓取中',
    completed: '已完成',
    error: '出错'
  }
  return map[status.value] || status.value
})

const canStartCrawl = computed(() => loginStatus.value === 'logged_in' && keywords.value.length > 0)
const hasResults = computed(() => allAuthors.value.length > 0)
const authorCount = computed(() => allAuthors.value.length)

const filteredAuthors = computed(() => {
  let list = allAuthors.value
  
  if (selectedKeyword.value) {
    list = list.filter(a => a.keyword === selectedKeyword.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a => 
      (a.nick_name && a.nick_name.toLowerCase().includes(q)) || 
      (a.id && a.id.includes(q))
    )
  }
  
  return list.sort((a, b) => {
    if (sortField.value === 'follower') return (b.follower || 0) - (a.follower || 0)
    if (sortField.value === 'star_index') return (parseFloat(b.star_index) || 0) - (parseFloat(a.star_index) || 0)
    if (sortField.value === 'interaction_rate') return (b.interaction_rate || 0) - (a.interaction_rate || 0)
    if (sortField.value === 'cpm_20_60') return (parseFloat(b.prospective_20_60_cpm) || 0) - (parseFloat(a.prospective_20_60_cpm) || 0)
    if (sortField.value === 'price_20_60') return (parseInt(b.price_20_60_raw || 0) - parseInt(a.price_20_60_raw || 0))
    return 0
  })
})

function getKeywordStat(result, type) {
  if (!result.authors) return 0
  if (type === 'with_prices') {
    return result.authors.filter(a => a.price_1_20 || a.price_20_60 || a.price_60).length
  }
  if (type === 'with_ecommerce') {
    return result.authors.filter(a => a.e_commerce_enable === '是').length
  }
  if (type === 'avg_followers') {
    const total = result.authors.reduce((sum, a) => sum + (a.follower || 0), 0)
    const avg = result.authors.length > 0 ? Math.round(total / result.authors.length) : 0
    return formatFollower(avg)
  }
  return 0
}

function formatFollower(num) {
  if (!num) return '0'
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

function addKeyword() {
  const kw = keywordInput.value.trim()
  if (!kw) return
  if (keywords.value.some(k => k.keyword === kw)) { alert('关键词已存在'); return }
  keywords.value.push({ keyword: kw, maxPages: pagesInput.value || 3 })
  keywordInput.value = ''
}

function addQuickKeyword(q) {
  if (keywords.value.some(k => k.keyword === q)) return
  keywords.value.push({ keyword: q, maxPages: pagesInput.value || 3 })
}

function removeKeyword(i) { keywords.value.splice(i, 1) }

async function handleStartBrowser() {
  const res = await api.startBrowser()
  if (res.success) { status.value = 'waiting_login'; currentTask.value = '等待登录...'; startPoll() }
  else { alert('启动失败: ' + res.error) }
}

async function handleCheckLogin() {
  const res = await api.checkLogin()
  if (res.loggedIn) { loginStatus.value = 'logged_in'; status.value = 'logged_in'; currentTask.value = '已登录'; alert('已登录，点击确认登录继续') }
  else { alert('未登录，请先在浏览器中完成登录') }
}

async function handleConfirmLogin() {
  const res = await api.confirmLogin()
  if (res.success) { status.value = 'ready'; currentTask.value = '准备就绪' }
  else { alert('确认失败: ' + res.error) }
}

async function handleStartCrawl() {
  if (keywords.value.length === 0) { alert('请先添加关键词'); return }
  const res = await api.startCrawl(keywords.value)
  if (res.success) {
    results.value = res.results || []
    allAuthors.value = results.value.filter(r => r.success).flatMap(r => r.authors || [])
    summary.value = res.summary
    files.value = res.files || []
    status.value = 'completed'
    currentTask.value = '抓取完成'
    stopPoll()
  } else { alert('抓取失败: ' + res.error) }
}

function startPoll() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    const res = await api.getStatus()
    status.value = res.status || 'idle'
    loginStatus.value = res.loginStatus || 'not_logged_in'
    currentTask.value = res.currentTask || ''
    progress.value = res.progress || 0
  }, 1000)
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --bg-card-hover: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: #334155;
  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

body { 
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
  background: var(--bg-dark); 
  color: var(--text-primary); 
  min-height: 100vh; 
}

.app { display: flex; flex-direction: column; min-height: 100vh; }

.header {
  background: var(--bg-card);
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: baseline; gap: 12px; }
.header h1 { font-size: 20px; font-weight: 700; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.header-desc { font-size: 13px; color: var(--text-muted); }

.status-indicator { display: flex; align-items: center; gap: 8px; }
.status-text { font-size: 13px; color: var(--text-secondary); }

.main-layout { display: flex; flex: 1; overflow: hidden; }

.left-panel { 
  width: 340px; 
  flex-shrink: 0; 
  background: linear-gradient(180deg, var(--bg-card) 0%, rgba(30,41,59,0.8) 100%);
  border-right: 1px solid var(--border-color); 
  padding: 16px; 
  overflow-y: auto; 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
}

.right-panel { 
  flex: 1; 
  padding: 16px 24px; 
  overflow-y: auto; 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
  background: radial-gradient(ellipse at top right, rgba(99,102,241,0.1) 0%, transparent 50%);
}

.panel { 
  background: var(--bg-card); 
  border-radius: 12px; 
  padding: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.panel:hover { border-color: rgba(99,102,241,0.3); }

.glow-border {
  box-shadow: 0 0 0 1px rgba(99,102,241,0.1), 0 4px 6px -1px rgba(0,0,0,0.3);
}

.gradient-panel {
  background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%);
  border: 1px solid rgba(99,102,241,0.3);
}

.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.panel-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.panel-count { font-size: 12px; color: var(--text-muted); }

.status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.dot-default { background: var(--text-muted); }
.dot-warning { background: var(--warning); animation: pulse 1.5s infinite; }
.dot-success { background: var(--success); }
.dot-info { background: var(--info); }
.dot-primary { background: var(--primary); animation: pulse 1.5s infinite; }
.dot-error { background: var(--error); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.login-controls { display: flex; flex-direction: column; gap: 10px; }

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: var(--bg-card-hover);
  color: var(--text-primary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:hover:not(:disabled) { background: var(--border-color); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-icon { font-size: 14px; }
.btn-icon-lg { font-size: 18px; }

.btn-primary { background: var(--gradient-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-success { background: var(--gradient-success); color: #fff; }
.btn-success:hover:not(:disabled) { filter: brightness(1.1); }
.btn-outline { background: transparent; border: 1px solid var(--border-color); }
.btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-glow { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
.btn-large { padding: 14px; font-size: 15px; }
.btn-block { width: 100%; }
.pulse { animation: glow-pulse 2s infinite; }
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 30px rgba(99,102,241,0.5); }
}

.task-info { font-size: 12px; color: var(--text-muted); margin-top: 10px; }

.progress-bar { height: 6px; background: var(--bg-dark); border-radius: 3px; margin-top: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--gradient-primary); transition: width 0.3s; border-radius: 3px; }
.progress-info { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 6px; }

.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.param-item { display: flex; flex-direction: column; gap: 6px; }
.param-label { font-size: 12px; color: var(--text-muted); }
.param-input-wrap { position: relative; }
.param-input { 
  width: 100%; 
  padding: 10px 12px; 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  font-size: 14px; 
  background: var(--bg-dark);
  color: var(--text-primary);
  transition: all 0.2s;
}
.param-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }

.keyword-input-group { display: flex; gap: 8px; }
.keyword-input { 
  flex: 1; 
  padding: 10px 12px; 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  font-size: 13px; 
  background: var(--bg-dark);
  color: var(--text-primary);
}
.keyword-input:focus { outline: none; border-color: var(--primary); }

.quick-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; align-items: center; }
.quick-label { font-size: 11px; color: var(--text-muted); margin-right: 4px; }
.tag { 
  padding: 5px 12px; 
  background: var(--bg-card-hover); 
  border: 1px solid var(--border-color); 
  border-radius: 16px; 
  font-size: 12px; 
  color: var(--text-secondary); 
  cursor: pointer;
  transition: all 0.2s;
}
.tag:hover { 
  background: var(--primary); 
  border-color: var(--primary); 
  color: #fff;
  transform: translateY(-1px);
}

.keyword-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.keyword-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 10px 12px; 
  background: var(--bg-card-hover); 
  border-radius: 8px;
  transition: all 0.2s;
}
.keyword-item:hover { background: var(--border-color); }
.kw-main { display: flex; align-items: center; gap: 8px; }
.kw-tag { 
  padding: 3px 10px; 
  border-radius: 12px; 
  font-size: 12px; 
  color: #fff;
  font-weight: 500;
}
.kw-params { font-size: 11px; color: var(--text-muted); }
.kw-remove { 
  background: none; 
  border: none; 
  color: var(--text-muted); 
  cursor: pointer; 
  font-size: 18px; 
  width: 24px; 
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}
.kw-remove:hover { color: var(--error); background: rgba(239,68,68,0.1); }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px;
  background: var(--bg-card-hover);
  border-radius: 10px;
  transition: all 0.2s;
}
.stat-card:hover { transform: translateY(-2px); }
.stat-icon { font-size: 20px; margin-bottom: 4px; }
.stat-value { font-size: 22px; font-weight: 700; }
.stat-label { font-size: 11px; color: var(--text-muted); }
.stat-primary .stat-value { color: var(--primary); }
.stat-success .stat-value { color: var(--success); }
.stat-warning .stat-value { color: var(--warning); }
.stat-info .stat-value { color: var(--info); }

.table-toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 8px; }
.toolbar-right { display: flex; gap: 8px; }

.keyword-filter { display: flex; flex-wrap: wrap; gap: 6px; }
.filter-btn {
  padding: 6px 14px;
  background: var(--bg-card-hover);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.filter-btn:hover { border-color: var(--primary); color: var(--primary); }
.filter-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }

.search-input { 
  padding: 8px 12px; 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  font-size: 13px; 
  background: var(--bg-card);
  color: var(--text-primary);
  width: 160px;
}
.search-input:focus { outline: none; border-color: var(--primary); }
.sort-select { 
  padding: 8px 12px; 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  font-size: 13px; 
  background: var(--bg-card); 
  color: var(--text-primary);
}

.table-wrap { max-height: 500px; overflow: auto; border-radius: 8px; }
.table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
.table-wrap::-webkit-scrollbar-track { background: var(--bg-dark); border-radius: 3px; }
.table-wrap::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
.table-wrap::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
th { 
  background: var(--bg-dark); 
  font-weight: 600; 
  color: var(--text-secondary); 
  position: sticky; 
  top: 0; 
  z-index: 10;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.author-row { transition: background 0.2s; }
.author-row:hover { background: var(--bg-card-hover); }

.keyword-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; color: #fff; font-weight: 500; }
.td-name { max-width: 120px; }
.name-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.td-num { font-weight: 600; color: var(--text-primary); }
.td-rate { color: var(--success); }
.td-price { color: var(--warning); font-weight: 500; }
.td-cpm { color: var(--info); }
.td-cpm.highlight { color: var(--primary); font-weight: 600; }
.td-index { color: var(--text-secondary); }
.td-level { 
  padding: 2px 8px; 
  background: var(--gradient-success); 
  border-radius: 10px; 
  font-size: 10px; 
  color: #fff;
}

.result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.result-card {
  background: var(--bg-card-hover);
  border-radius: 10px;
  padding: 14px;
  border-left: 3px solid;
  transition: all 0.2s;
}
.result-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.result-kw { font-weight: 600; font-size: 14px; }
.badge { padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 500; }
.badge-success { background: rgba(16,185,129,0.2); color: var(--success); }
.badge-error { background: rgba(239,68,68,0.2); color: var(--error); }
.result-stats { display: flex; gap: 10px; }
.result-stat { display: flex; flex-direction: column; gap: 2px; }
.rs-label { font-size: 10px; color: var(--text-muted); }
.rs-value { font-size: 13px; font-weight: 600; color: var(--text-primary); }

.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-item { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  padding: 12px 14px; 
  background: var(--bg-card-hover); 
  border-radius: 8px; 
  text-decoration: none; 
  color: inherit;
  transition: all 0.2s;
}
.file-item:hover { background: var(--border-color); transform: translateX(4px); }
.file-icon { font-size: 20px; }
.file-name { flex: 1; font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; }
.btn-download { padding: 4px 12px; background: var(--gradient-primary); color: #fff; border-radius: 6px; font-size: 11px; }

.empty-panel { display: flex; align-items: center; justify-content: center; min-height: 400px; }
.empty-content { text-align: center; color: var(--text-muted); }
.empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 18px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.empty-tip { font-size: 13px; }

@media (max-width: 1024px) { 
  .main-layout { flex-direction: column; } 
  .left-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); } 
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
