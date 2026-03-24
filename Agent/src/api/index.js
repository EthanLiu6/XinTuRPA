const API = 'http://localhost:3001'
const XINGTU_API = 'http://localhost:3000/api'

export async function processDemand(skillType, content, apiKey, model) {
  return fetch(`${API}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillType, content, apiKey, model })
  }).then(r => r.json())
}

export async function chat(messages, apiKey, model) {
  return fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, apiKey, model })
  }).then(r => r.json())
}

export async function getSkills() {
  return fetch(`${API}/api/skills`).then(r => r.json())
}

export async function launchXingtuSearch(keywords) {
  const formattedKeywords = keywords.map(kw => ({
    keyword: kw,
    maxPages: 3
  }))
  return fetch(`${XINGTU_API}/start-from-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords: formattedKeywords, autoLaunch: true })
  }).then(r => r.json())
}

export async function checkXingtuStatus() {
  return fetch(`${XINGTU_API}/status`).then(r => r.json())
}
