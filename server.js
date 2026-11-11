require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const apiKey = process.env.KIE_API_KEY || '';
const base = (process.env.KIE_API_BASE_URL || 'https://api.kie.ai/api/v1').replace(/\/+$/, '');
const createPath = process.env.KIE_CREATE_PATH || '/generate';
const statusPath = process.env.KIE_STATUS_PATH || '/generate/record-info';
const endpoint = p => `${base}/${String(p).replace(/^\/+/, '')}`;

async function kieFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error || `Kie.ai HTTP ${response.status}`);
  return data;
}
function taskIdFrom(data) {
  return data?.data?.taskId || data?.data?.task_id || data?.taskId || data?.task_id || data?.id || null;
}
function audioFrom(value, depth = 0) {
  if (!value || depth > 8) return null;
  if (Array.isArray(value)) {
    for (const item of value) { const result = audioFrom(item, depth + 1); if (result) return result; }
  } else if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (/audio.?url|source.?url|stream.?url|download.?url/i.test(key) && typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
    }
    for (const val of Object.values(value)) { const result = audioFrom(val, depth + 1); if (result) return result; }
  }
  return null;
}
app.get('/api/health', (_req, res) => res.json({
  ok: true, app: 'Nadir Music AI', provider: 'Kie.ai / Suno', configured: Boolean(apiKey)
}));

app.post('/api/generate', async (req, res) => {
  if (!apiKey) return res.status(503).json({ error: 'API key belum diisi. Masukkan KIE_API_KEY di file .env lalu restart aplikasi.' });
  const { title, lyrics = '', prompt = '', genre = '', vocalGender = 'Pria', instrumental = false } = req.body || {};
  if (!String(title).trim() || !String(prompt).trim()) return res.status(400).json({ error: 'Judul dan Music Prompt wajib diisi.' });
  const female = /wanita|female|woman/i.test(vocalGender);
  const payload = {
    prompt: String(prompt).slice(0, 2000),
    customMode: true,
    instrumental: Boolean(instrumental),
    model: process.env.KIE_MODEL || 'V4_5',
    title: String(title).slice(0, 120),
    style: String(genre).slice(0, 300),
    vocalGender: female ? 'f' : 'm',
    ...(String(lyrics).trim() ? { lyrics: String(lyrics).slice(0, 5000) } : {}),
    ...(process.env.KIE_CALLBACK_URL ? { callBackUrl: process.env.KIE_CALLBACK_URL } : {})
  };
  try {
    const data = await kieFetch(endpoint(createPath), { method: 'POST', body: JSON.stringify(payload) });
    const taskId = taskIdFrom(data);
    if (!taskId) return res.status(502).json({ error: 'Respons Kie.ai tidak memuat taskId. Periksa versi dokumentasi dan format respons.', providerResponse: data });
    res.json({ ok: true, taskId: String(taskId), status: 'submitted' });
  } catch (error) {
    console.error('Kie.ai generate:', error.message);
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/tasks/:taskId', async (req, res) => {
  if (!apiKey) return res.status(503).json({ error: 'API key belum dikonfigurasi.' });
  try {
    const url = new URL(endpoint(statusPath));
    url.searchParams.set('taskId', req.params.taskId);
    const data = await kieFetch(url.toString(), { method: 'GET' });
    const audioUrl = audioFrom(data);
    const flat = JSON.stringify(data).toLowerCase();
    const failed = /"status"\s*:\s*"(failed|error)"/.test(flat) || /"success"\s*:\s*false/.test(flat);
    const completed = Boolean(audioUrl) || /"status"\s*:\s*"(complete|completed|success|succeeded)"/.test(flat);
    res.json({ ok: true, taskId: req.params.taskId, status: failed ? 'failed' : completed ? 'completed' : 'processing', audioUrl });
  } catch (error) {
    console.error('Kie.ai status:', error.message);
    res.status(502).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Nadir Music AI berjalan di http://localhost:${port}`));
