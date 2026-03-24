import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import OpenAI from 'openai'
import XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const rootDir = join(__dirname, '..')
const configPath = join(rootDir, 'config.json')
const uploadDir = join(rootDir, 'uploads')
const demandDir = join(rootDir, 'docs', 'demand')

const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {}

if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })
if (!existsSync(demandDir)) mkdirSync(demandDir, { recursive: true })

const app = express()
const PORT = config.port || 3001

app.use(cors())
app.use(express.json())

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const skills = {
  demand_msg: readFileSync(join(__dirname, 'skills', 'DemandMsg.md'), 'utf8'),
  search_json: readFileSync(join(__dirname, 'skills', 'SearchWithJson.md'), 'utf8')
}

function buildDemandAnalysisPrompt() {
  return `你是专业的营销需求分析专家。以下是两个Agent Skills，请严格遵循它们来处理需求文档：

## Skill 1: 需求信息整理
${skills.demand_msg}

## Skill 2: JSON参数转换
${skills.search_json}

## 执行要求

请按照以下步骤处理用户上传的需求文档：

**步骤1**: 使用 Skill 1 (需求信息整理) 分析需求文档，提取：
- 目标人群画像（核心人群、圈外人群）
- 达人搜索核心关键词

**步骤2**: 使用 Skill 2 (JSON参数转换) 将分析结果转换为标准JSON格式

**步骤3**: 整合输出，格式如下：

【人群画像分析】
<Skill 1 提取的人群画像内容>

【关键词列表】
- 通用核心词: <关键词列表>
- 核心人群适配: <关键词列表>
- 圈外人群适配: <关键词列表>

【JSON参数】
<标准JSON格式的输出>

请直接输出分析结果，不要添加额外的解释说明。`
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    const filePath = req.file.path
    const ext = req.file.originalname.split('.').pop().toLowerCase()
    let content = ''

    if (['xlsx', 'xls'].includes(ext)) {
      const workbook = XLSX.readFile(filePath)
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        content += `\n=== Sheet: ${sheetName} ===\n`
        for (const row of data) {
          if (row.some(cell => cell !== '')) {
            content += row.filter(cell => cell !== '').join(' | ') + '\n'
          }
        }
      }
    } else {
      content = readFileSync(filePath, 'utf8')
    }

    res.json({ success: true, fileName: req.file.originalname, content: content.trim() })
  } catch (error) {
    console.error('Upload Error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/demand-files', (req, res) => {
  try {
    const files = readdirSync(demandDir)
      .filter(f => /\.(xlsx|xls|txt|doc|docx|pdf|md)$/i.test(f))
      .map(f => {
        const stats = statSync(join(demandDir, f))
        return { name: f, size: stats.size, modified: stats.mtime }
      })
    res.json({ files })
  } catch (error) {
    console.error('demand-files error:', error)
    res.json({ files: [] })
  }
})

app.post('/api/read-demand', async (req, res) => {
  try {
    const { fileName } = req.body
    if (!fileName) {
      return res.status(400).json({ error: '缺少文件名' })
    }
    
    const filePath = join(demandDir, fileName)
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }

    const ext = fileName.split('.').pop().toLowerCase()
    let content = ''

    if (['xlsx', 'xls'].includes(ext)) {
      const workbook = XLSX.readFile(filePath)
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        content += `\n=== Sheet: ${sheetName} ===\n`
        for (const row of data) {
          if (row.some(cell => cell !== '')) {
            content += row.filter(cell => cell !== '').join(' | ') + '\n'
          }
        }
      }
    } else {
      content = readFileSync(filePath, 'utf8')
    }

    res.json({ content: content.trim() })
  } catch (error) {
    console.error('Read Error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/analyze', async (req, res) => {
  const { content } = req.body
  
  if (!content) {
    return res.status(400).json({ error: '缺少需求内容' })
  }
  
  if (!config.apiKey) {
    return res.status(400).json({ error: '未配置API Key，请在config.json中设置' })
  }

  try {
    const client = new OpenAI({ 
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1'
    })

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    const completion = await client.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildDemandAnalysisPrompt() },
        { role: 'user', content: `请分析以下需求文档：\n\n${content}` }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    })

    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`)
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (error) {
    console.error('Analyze Error:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
    res.end()
  }
})

app.post('/api/analyze-sync', async (req, res) => {
  const { content } = req.body
  
  if (!content) {
    return res.status(400).json({ error: '缺少需求内容' })
  }
  
  if (!config.apiKey) {
    return res.status(400).json({ error: '未配置API Key，请在config.json中设置' })
  }

  try {
    const client = new OpenAI({ 
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1'
    })

    const completion = await client.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildDemandAnalysisPrompt() },
        { role: 'user', content: `请分析以下需求文档：\n\n${content}` }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })

    const result = completion.choices[0]?.message?.content || ''
    const analysis = parseAnalysisResult(result)
    
    res.json({ result, analysis })
  } catch (error) {
    console.error('Analyze Error:', error)
    res.status(500).json({ error: error.message })
  }
})

function parseAnalysisResult(text) {
  const analysis = { persona: '', keywords: { common: [], core: [], outside: [] }, json: null }

  const personaMatch = text.match(/【人群画像分析】([\s\S]*?)(?=【关键词列表】|$)/i)
  if (personaMatch) {
    analysis.persona = personaMatch[1].trim()
  }

  const kwSection = text.match(/【关键词列表】([\s\S]*?)(?=【JSON参数】|$)/i)
  if (kwSection) {
    const kwText = kwSection[1]
    const commonMatch = kwText.match(/通用核心词[:：]\s*([^\n-]+)/i)
    const coreMatch = kwText.match(/核心人群适配[:：]\s*([^\n-]+)/i)
    const outsideMatch = kwText.match(/圈外人群适配[:：]\s*([^\n-]+)/i)
    
    if (commonMatch) analysis.keywords.common = commonMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean)
    if (coreMatch) analysis.keywords.core = coreMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean)
    if (outsideMatch) analysis.keywords.outside = outsideMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean)
  }

  const jsonMatch = text.match(/【JSON参数】([\s\S]*)/i)
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1].match(/\{[\s\S]*\}/)?.[0]
      if (jsonStr) {
        analysis.json = JSON.parse(jsonStr)
      }
    } catch (e) {
      analysis.jsonRaw = jsonMatch[1].trim()
    }
  }

  return analysis
}

app.get('/api/config', (req, res) => {
  res.json({
    configured: !!config.apiKey,
    model: config.model || 'gpt-4o-mini'
  })
})

app.get('/api/skills', (req, res) => {
  res.json({
    skills: Object.keys(skills).map(key => ({
      name: key,
      description: key === 'demand_msg' 
        ? '需求信息整理 - 提取目标人群画像和关键词'
        : 'JSON参数整理 - 生成标准化JSON参数'
    }))
  })
})

app.listen(PORT, () => {
  console.log('='.repeat(50))
  console.log('  星图达人需求分析系统')
  console.log(`  服务地址: http://localhost:${PORT}`)
  console.log(`  API Key: ${config.apiKey ? '已配置' : '未配置!'}`)
  console.log(`  模型: ${config.model || 'gpt-4o-mini'}`)
  console.log('='.repeat(50))
})
