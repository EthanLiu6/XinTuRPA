const API = '/api'

export async function startBrowser() {
  return fetch(`${API}/start-browser`, { method: 'POST' }).then(r => r.json())
}

export async function checkLogin() {
  return fetch(`${API}/check-login`, { method: 'POST' }).then(r => r.json())
}

export async function confirmLogin() {
  return fetch(`${API}/confirm-login`, { method: 'POST' }).then(r => r.json())
}

export async function closeBrowser() {
  return fetch(`${API}/close-browser`, { method: 'POST' }).then(r => r.json())
}

export async function startCrawl(keywords) {
  return fetch(`${API}/start-crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords })
  }).then(r => r.json())
}

export async function getStatus() {
  return fetch(`${API}/status`).then(r => r.json())
}

export async function getFiles() {
  return fetch(`${API}/files`).then(r => r.json())
}

export async function getAuthors() {
  return fetch(`${API}/authors`).then(r => r.json())
}
