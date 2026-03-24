<template>
  <div class="container">
    <div class="header">
      <h1>星图达人需求分析系统</h1>
      <p>上传客户需求文档，AI智能提取目标人群画像与关键词，生成达人搜索参数</p>
    </div>

    <div class="card">
      <div class="card-title">1. 选择或上传需求文档</div>
      
      <div class="file-tabs">
        <button class="tab-btn" :class="{ active: fileSource === 'local' }" @click="fileSource = 'local'">上传文件</button>
        <button class="tab-btn" :class="{ active: fileSource === 'docs' }" @click="loadDemandFiles">需求文档库</button>
      </div>

      <div v-if="fileSource === 'local'">
        <div 
          class="upload-area" 
          :class="{ dragover: isDragover }"
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragover = true"
          @dragleave="isDragover = false"
          @click="$refs.fileInput.click()"
        >
          <div class="upload-icon">📄</div>
          <div class="upload-text">
            拖拽文件到此处或 <strong>点击选择文件</strong><br>
            <small>支持 .xlsx, .xls, .txt, .md 格式</small>
          </div>
          <input type="file" ref="fileInput" @change="handleFileSelect" accept=".xlsx,.xls,.txt,.md" style="display:none">
        </div>

        <div v-if="uploadedFile" class="file-info">
          <div class="file-icon">{{ getFileIcon(uploadedFile.name) }}</div>
          <div class="file-details">
            <div class="file-name">{{ uploadedFile.name }}</div>
            <div class="file-size">{{ formatFileSize(uploadedFile.size) }}</div>
          </div>
          <button class="btn btn-secondary" @click="clearFile">移除</button>
        </div>
      </div>

      <div v-if="fileSource === 'docs'">
        <div v-if="demandFiles.length === 0" class="empty-tip">
          暂无文档，请上传到 Agent/docs/demand 目录
        </div>
        <div v-else class="file-list">
          <div 
            v-for="file in demandFiles" 
            :key="file.name"
            class="history-item"
            :class="{ selected: selectedDemandFile === file.name }"
            @click="selectDemandFile(file.name)"
          >
            <div class="file-icon-small">📊</div>
            <div class="file-details">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" :disabled="!hasContent || !apiReady || processing" @click="startAnalysis">
          {{ processing ? '分析中...' : '开始分析' }}
        </button>
        <button class="btn btn-secondary" @click="loadSample" :disabled="processing">加载示例</button>
      </div>
      
      <div v-if="!apiReady" class="config-warning">
        ⚠️ 系统未配置API Key，请在 config.json 中配置
      </div>
    </div>

    <div class="card" v-if="hasContent && !result">
      <div class="card-title">文档预览</div>
      <div class="content-preview">{{ content.substring(0, 500) }}{{ content.length > 500 ? '...' : '' }}</div>
    </div>

    <div class="card" v-if="processing">
      <div class="card-title">2. AI 分析中...</div>
      <div class="loading">
        <div class="spinner"></div>
        <div class="processing-text">{{ processingMessage }}</div>
      </div>
      <div class="stream-output" v-if="streamContent">
        <pre>{{ streamContent }}</pre>
      </div>
    </div>

    <div class="card" v-if="error">
      <div class="error">
        <strong>错误:</strong> {{ error }}
      </div>
    </div>

    <div class="card" v-if="result && !processing">
      <div class="card-title">3. 分析结果</div>
      
      <div class="result-section">
        <div class="result-label">📊 目标人群画像</div>
        <div class="result-content">{{ result.persona || '未提取到人群画像' }}</div>
      </div>

      <div class="result-section">
        <div class="result-label">🔑 关键词列表</div>
        <div class="keyword-tags">
          <span class="keyword-tag common" v-for="kw in result.keywords?.common" :key="'c-' + kw">{{ kw }}</span>
          <span class="keyword-tag" v-for="kw in result.keywords?.core" :key="'k-' + kw">{{ kw }}</span>
          <span class="keyword-tag outside" v-for="kw in result.keywords?.outside" :key="'o-' + kw">{{ kw }}</span>
        </div>
        <div class="keyword-legend">
          <span class="legend-item"><span class="dot common"></span> 通用核心词</span>
          <span class="legend-item"><span class="dot core"></span> 核心人群</span>
          <span class="legend-item"><span class="dot outside"></span> 圈外人群</span>
        </div>
      </div>

      <div class="result-section" v-if="result.json">
        <div class="result-label">📋 JSON 参数</div>
        <div class="json-output">{{ formatJson(result.json) }}</div>
      </div>

      <div class="result-section">
        <div class="result-label">📄 原始分析文本</div>
        <div class="raw-result">
          <pre>{{ rawResult }}</pre>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" @click="copyKeywords">复制关键词</button>
        <button class="btn btn-primary" @click="copyJson">复制 JSON</button>
        <button class="btn btn-secondary" @click="exportResult">导出结果</button>
        <button class="btn btn-success" @click="launchXingtuSearch" :disabled="xingtuLaunching || allKeywords.length === 0">
          {{ xingtuLaunching ? '启动中...' : '🚀 启动星图搜索' }}
        </button>
      </div>
      <div class="xingtu-tip" v-if="allKeywords.length > 0">
        将启动 {{ allKeywords.length }} 个关键词的搜索：{{ allKeywords.slice(0, 5).join(', ') }}{{ allKeywords.length > 5 ? '...' : '' }}
      </div>
    </div>
  </div>
</template>

<script>
import { processDemand, chat, getSkills, launchXingtuSearch, checkXingtuStatus } from './api/index.js'

export default {
  data() {
    return {
      isDragover: false,
      fileSource: 'local',
      uploadedFile: null,
      content: '',
      apiReady: false,
      processing: false,
      processingMessage: '',
      error: '',
      streamContent: '',
      result: null,
      rawResult: '',
      demandFiles: [],
      selectedDemandFile: '',
      xingtuStatus: 'not_checked',
      xingtuLaunching: false
    }
  },
  computed: {
    hasContent() {
      return this.content.trim().length > 0
    },
    allKeywords() {
      if (!this.result?.keywords) return []
      return [
        ...(this.result.keywords.common || []),
        ...(this.result.keywords.core || []),
        ...(this.result.keywords.outside || [])
      ]
    }
  },
  mounted() {
    this.checkConfig()
  },
  methods: {
    async checkConfig() {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        this.apiReady = data.configured
        if (!this.apiReady) {
          this.error = '请在 config.json 中配置 API Key'
        }
      } catch (e) {
        this.apiReady = false
      }
    },
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      if (['xlsx', 'xls'].includes(ext)) return '📊'
      if (['doc', 'docx'].includes(ext)) return '📝'
      return '📄'
    },
    handleDrop(e) {
      this.isDragover = false
      const file = e.dataTransfer.files[0]
      if (file) this.uploadFile(file)
    },
    handleFileSelect(e) {
      const file = e.target.files[0]
      if (file) this.uploadFile(file)
    },
    async uploadFile(file) {
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          this.uploadedFile = { name: file.name, size: file.size }
          this.content = data.content
          this.selectedDemandFile = ''
        } else {
          this.error = data.error
        }
      } catch (e) {
        this.error = '上传失败: ' + e.message
      }
    },
    async loadDemandFiles() {
      this.fileSource = 'docs'
      try {
        const res = await fetch('/api/demand-files')
        const data = await res.json()
        this.demandFiles = data.files || []
      } catch (e) {
        this.error = '加载文件列表失败'
      }
    },
    async selectDemandFile(filename) {
      this.selectedDemandFile = filename
      try {
        const res = await fetch('/api/read-demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: filename })
        })
        const data = await res.json()
        if (data.content) {
          this.content = data.content
          this.uploadedFile = { name: filename, size: 0 }
        } else {
          this.error = data.error || '读取文件失败'
        }
      } catch (e) {
        this.error = '读取文件失败: ' + e.message
      }
    },
    clearFile() {
      this.uploadedFile = null
      this.content = ''
      this.result = null
      this.selectedDemandFile = ''
    },
    loadSample() {
      this.content = `品牌名称：逆战未来
产品类型：游戏新赛季内容营销
产品名称：逆战未来S2新赛季

营销目标：
1. 提升逆战未来S2新赛季知名度
2. 吸引老玩家回流
3. 触达新玩家群体

目标人群：
- 核心人群：FPS游戏玩家，18-30岁男性，有射击游戏经验
- 圈外人群：对科幻题材感兴趣的手游用户

达人需求：
- 风格：游戏实况、攻略解说
- 内容形式：视频、直播
- 平台：抖音、B站

预算：50万
投放周期：2024年Q1`
      this.uploadedFile = { name: '示例需求.txt', size: 0 }
    },
    async startAnalysis() {
      if (!this.content) return
      
      this.processing = true
      this.error = ''
      this.result = null
      this.rawResult = ''
      this.streamContent = ''
      this.processingMessage = 'AI 正在分析需求文档...'

      try {
        const response = await fetch('/api/analyze-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: this.content })
        })

        const data = await response.json()
        
        if (data.error) {
          this.error = data.error
        } else {
          this.rawResult = data.result
          this.result = data.analysis
        }
      } catch (e) {
        this.error = '分析失败: ' + e.message
      } finally {
        this.processing = false
      }
    },
    formatJson(json) {
      return JSON.stringify(json, null, 2)
    },
    copyKeywords() {
      if (!this.result?.keywords) return
      const all = [
        ...(this.result.keywords.common || []),
        ...(this.result.keywords.core || []),
        ...(this.result.keywords.outside || [])
      ]
      navigator.clipboard.writeText(all.join(', '))
      alert('关键词已复制!')
    },
    copyJson() {
      if (!this.result?.json) return
      navigator.clipboard.writeText(JSON.stringify(this.result.json, null, 2))
      alert('JSON已复制!')
    },
    exportResult() {
      const data = {
        sourceFile: this.uploadedFile?.name || '示例',
        content: this.content,
        analysis: this.result,
        rawResult: this.rawResult,
        exportTime: new Date.toISOString()
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `demand-analysis-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    async launchXingtuSearch() {
      if (this.allKeywords.length === 0) {
        alert('请先完成需求分析')
        return
      }
      
      this.xingtuLaunching = true
      try {
        const res = await launchXingtuSearch(this.allKeywords)
        if (res.success) {
          alert(`关键词已传递给星图系统！\n\n请在打开的星图系统中：\n1. 完成登录\n2. 点击"确认登录"\n3. 点击"开始抓取"\n\n关键词：${this.allKeywords.join(', ')}`)
          window.open('http://localhost:3000', '_blank')
        } else {
          alert('启动失败: ' + (res.error || '未知错误'))
        }
      } catch (e) {
        alert('无法连接星图系统，请确保星图RPA服务已启动\n\n启动命令：cd XinTuRPA && npm run server')
      } finally {
        this.xingtuLaunching = false
      }
    },
    async checkXingtuStatus() {
      try {
        const res = await checkXingtuStatus()
        this.xingtuStatus = res.status || 'unknown'
      } catch (e) {
        this.xingtuStatus = 'offline'
      }
    }
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
.header h1 { font-size: 28px; margin-bottom: 8px; }
.header p { opacity: 0.9; font-size: 14px; }
.card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.card-title { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 16px; }
.upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
.upload-area:hover { border-color: #667eea; background: #f8f9ff; }
.upload-area.dragover { border-color: #667eea; background: #f0f2ff; }
.upload-icon { font-size: 48px; color: #667eea; margin-bottom: 12px; }
.upload-text { color: #666; font-size: 14px; }
.upload-text strong { color: #667eea; }
.file-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8f9ff; border-radius: 8px; margin-top: 16px; }
.file-icon { width: 40px; height: 40px; background: #667eea; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.file-icon-small { width: 32px; height: 32px; background: #667eea; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
.file-details { flex: 1; }
.file-name { font-weight: 500; color: #333; }
.file-size { font-size: 12px; color: #999; margin-top: 2px; }
.btn { padding: 10px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover { background: #5568d3; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; transform: none; }
.btn-secondary { background: #f0f0f0; color: #666; }
.btn-secondary:hover { background: #e0e0e0; }
.btn-group { display: flex; gap: 12px; margin-top: 20px; }
.file-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 14px; }
.tab-btn.active { background: #667eea; color: white; border-color: #667eea; }
.file-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.history-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.history-item:hover { background: #f0f0f0; }
.history-item.selected { background: #e8edff; border: 1px solid #667eea; }
.empty-tip { text-align: center; padding: 40px; color: #999; }
.config-warning { margin-top: 12px; padding: 12px 16px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; color: #d48806; font-size: 14px; }
.content-preview { background: #f8f9fa; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #666; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
.loading { text-align: center; padding: 30px; }
.spinner { width: 40px; height: 40px; border: 3px solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.processing-text { color: #666; margin-top: 12px; }
.stream-output { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; margin-top: 20px; max-height: 400px; overflow-y: auto; font-family: Monaco, Menlo, monospace; font-size: 13px; }
.stream-output pre { white-space: pre-wrap; word-break: break-all; }
.error { color: #f5222d; padding: 16px; background: #fff1f0; border-radius: 8px; }
.result-section { margin-bottom: 24px; }
.result-section:last-child { margin-bottom: 0; }
.result-label { font-weight: 600; color: #667eea; margin-bottom: 12px; font-size: 15px; }
.result-content { background: #f8f9fa; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
.keyword-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.keyword-tag { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; color: white; }
.keyword-tag.common { background: #faad14; }
.keyword-tag:not(.common):not(.outside) { background: #667eea; }
.keyword-tag.outside { background: #52c41a; }
.keyword-legend { display: flex; gap: 20px; margin-top: 12px; font-size: 12px; color: #666; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.common { background: #faad14; }
.dot.core { background: #667eea; }
.dot.outside { background: #52c41a; }
.json-output { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; font-family: Monaco, Menlo, monospace; font-size: 13px; white-space: pre-wrap; overflow-x: auto; }
.raw-result { background: #f8f9fa; padding: 16px; border-radius: 8px; max-height: 400px; overflow-y: auto; }
.raw-result pre { white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
.btn-success { background: #52c41a; color: white; }
.btn-success:hover { background: #389e0d; }
.xingtu-tip { margin-top: 12px; padding: 10px 14px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; font-size: 13px; color: #52c41a; }
</style>
