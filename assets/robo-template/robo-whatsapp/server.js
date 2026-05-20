const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const firebaseConfig = require('../firebase-config.js');
const firebase = require('firebase/compat/app');
require('firebase/compat/database');
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const cfgPath = path.join(__dirname, '../robo-config.json');
const authPath = path.join(__dirname, '.wwebjs_auth');
let roboConfig = { tenantId: 'legacy_root', legacyMode: true, watchAllTenants: false, managerPhone: '', dailyLimit: 100, sendIntervalMs: 9000, signature: 'Powered by thIAguinho Soluções Digitais' };
if (fs.existsSync(cfgPath)) {
  const rawConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const legacyExplicito = Object.prototype.hasOwnProperty.call(rawConfig, 'legacyMode');
  roboConfig = Object.assign(roboConfig, rawConfig);
  if (!legacyExplicito && roboConfig.tenantId && roboConfig.tenantId !== 'legacy_root') {
    roboConfig.legacyMode = false;
  }
  if (roboConfig.tenantOnly === true) roboConfig.legacyMode = false;
}
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
let qrCodeData = '';
let ready = false;
let lastError = '';
let sentToday = 0;
let dayKey = new Date().toISOString().slice(0, 10);
let sending = false;
const watchedPaths = new Set();
function now() { return Date.now(); }
function digits(v) { return String(v || '').replace(/\D/g, ''); }
function strip55(v) { return digits(v).replace(/^55/, ''); }
function waKey(v) { return String(v || '').toLowerCase().replace(/[.#$\[\]\/]/g, '_'); }
function basePath(ctx) { return ctx && ctx.legacyMode ? '' : 'tenants/' + (ctx && ctx.tenantId || roboConfig.tenantId) + '/'; }
function queuePathFor(ctx) { return basePath(ctx) + 'whatsappQueue'; }
function refPath(ctx, child) { return basePath(ctx) + child; }
function todayReset() { const today = new Date().toISOString().slice(0, 10); if (today !== dayKey) { dayKey = today; sentToday = 0; } }
function normalizeStatus(v) { return String(v || '').toLowerCase(); }
function parsePrice(t) { const m = String(t || '').match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/); if (!m) return 0; let s = m[1]; if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.'); else if (s.includes(',')) s = s.replace(',', '.'); return Number(s) || 0; }
function parseBrand(t) { const m = String(t || '').match(/(?:marca|fab\.?|fabricante)\s*[:\-]?\s*([a-z0-9çãõáéíóúâêô\/\- ]{2,30})/i); return m ? m[1].trim() : ''; }
function parseBrandCode(t) { const m = String(t || '').match(/(?:c[oó]d(?:igo)?\s*(?:marca)?|ref(?:er[eê]ncia)?)\s*[:\-]?\s*([A-Z0-9.\/-]{3,})/i); return m ? m[1].trim() : ''; }
function parseAvailability(t) { const text = String(t || '').toLowerCase(); if (/n[aã]o\s+tenho|sem\s+estoque|indispon/.test(text)) return 'indisponível'; const m = String(t || '').match(/(?:hoje|amanh[aã]|\d+\s*dias?|pronta entrega|encomenda|\d+\s*h)/i); return m ? m[0] : ''; }
function isUnavailable(t) { return /n[aã]o\s+tenho|sem\s+estoque|indispon/.test(String(t || '').toLowerCase()); }
function getQuoteItems(q) { if (!q) return []; if (Array.isArray(q.items)) return q.items.map((x, i) => Object.assign({ id: x.id || 'item_' + i }, x)); if (q.pecas && typeof q.pecas === 'object') return Object.entries(q.pecas).map(([id, v]) => Object.assign({ id }, v || {})); return []; }
function itemCode(i) { return i.oem || i.codigoOriginal || i.codigo || i.altCode || ''; }
function itemDesc(i) { return i.desc || i.descricaoOriginal || i.descricao || ''; }
function itemQty(i) { return Number(i.qty || i.quantidade || 1) || 1; }
function findItemForText(items, text) { const low = String(text || '').toLowerCase(); let found = items.find(i => itemCode(i) && low.includes(String(itemCode(i)).toLowerCase())); if (found) return found; return items.find(i => { const words = String(itemDesc(i)).toLowerCase().split(/\s+/).filter(w => w.length > 3); return words.length && words.slice(0, 2).some(w => low.includes(w)); }); }
async function updateStatus(extra) { const payload = Object.assign({ status: ready ? 'WhatsApp conectado e pronto' : 'Aguardando QR Code', ready, sentToday, dayKey, updatedAt: now(), lastError, config: { tenantId: roboConfig.tenantId, legacyMode: !!roboConfig.legacyMode, watchAllTenants: !!roboConfig.watchAllTenants } }, extra || {}); await db.ref('robotStatus/main').update(payload).catch(() => {}); if (!roboConfig.legacyMode && roboConfig.tenantId) await db.ref('tenants/' + roboConfig.tenantId + '/robotStatus/main').update(payload).catch(() => {}); }
const client = new Client({ authStrategy: new LocalAuth({ dataPath: authPath }), puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] } });
client.on('qr', qr => { qrcode.toDataURL(qr, (err, url) => { if (!err) qrCodeData = url; updateStatus({ status: 'QR Code gerado' }); }); });
client.on('ready', () => { ready = true; qrCodeData = ''; lastError = ''; updateStatus(); startWatchers(); });
client.on('authenticated', () => updateStatus({ status: 'WhatsApp autenticado' }));
client.on('auth_failure', msg => { lastError = String(msg || 'Falha de autenticação'); ready = false; updateStatus({ status: 'Falha de autenticação' }); });
client.on('disconnected', reason => { ready = false; lastError = String(reason || 'Desconectado'); updateStatus({ status: 'WhatsApp desconectado' }); });
function startWatchers() { if (roboConfig.watchAllTenants) { db.ref('tenants').on('child_added', snap => watchQueue({ tenantId: snap.key, legacyMode: false })); } else if (roboConfig.legacyMode || roboConfig.tenantId === 'legacy_root') { watchQueue({ tenantId: 'legacy_root', legacyMode: true }); } else { watchQueue({ tenantId: roboConfig.tenantId, legacyMode: false }); } }
function watchQueue(ctx) { const qPath = queuePathFor(ctx); if (watchedPaths.has(qPath)) return; watchedPaths.add(qPath); db.ref(qPath).on('child_added', snap => { const item = snap.val() || {}; const st = normalizeStatus(item.status); if (st === 'pending' || st === 'pendente') processQueueItem(ctx, snap.key, item); }); setInterval(() => scanPending(ctx), Math.max(15000, Number(roboConfig.sendIntervalMs || 9000) * 2)); scanPending(ctx); }
async function scanPending(ctx) { const snap = await db.ref(queuePathFor(ctx)).once('value').catch(() => null); if (!snap) return; const rows = snap.val() || {}; for (const [id, w] of Object.entries(rows)) { const st = normalizeStatus(w.status); if (st === 'pending' || st === 'pendente') await processQueueItem(ctx, id, w); } }
async function processQueueItem(ctx, id, w) { if (sending || !ready) return; sending = true; try { todayReset(); if (sentToday >= Number(roboConfig.dailyLimit || 100)) { await db.ref(queuePathFor(ctx) + '/' + id).update({ status: 'error', error: 'limite diário atingido', updatedAt: now() }); return; } const phone = digits(w.phone || w.to || w.whatsapp); if (!phone) { await db.ref(queuePathFor(ctx) + '/' + id).update({ status: 'error', error: 'telefone ausente', updatedAt: now() }); return; } await db.ref(queuePathFor(ctx) + '/' + id).update({ status: 'sending', sendingAt: now(), updatedAt: now() }); await client.sendMessage(phone + '@c.us', String(w.message || '')); sentToday++; const sentAt = now(); await db.ref(queuePathFor(ctx) + '/' + id).update({ status: 'sent', sentAt, updatedAt: sentAt }); const map = { tenantId: ctx.tenantId, legacyMode: !!ctx.legacyMode, supplierId: w.supplierId || w.fornecedorId || '', phone, lastQuoteId: w.quoteId || w.cotacaoId || '', lastQueueId: id, mappedAt: sentAt }; await db.ref('whatsappContacts/' + strip55(phone)).update(map); await db.ref('whatsappContacts/' + waKey(phone + '@c.us')).update(map); await updateStatus(); } catch (e) { lastError = e && e.message || String(e); await db.ref(queuePathFor(ctx) + '/' + id).update({ status: 'error', error: lastError, updatedAt: now() }); await updateStatus({ status: 'Erro ao enviar' }); } finally { setTimeout(() => { sending = false; }, Number(roboConfig.sendIntervalMs || 9000)); } }
async function contextFromQueue(rawIds) { const all = []; if (roboConfig.legacyMode || roboConfig.watchAllTenants) all.push({ tenantId: 'legacy_root', legacyMode: true }); if (roboConfig.tenantId && roboConfig.tenantId !== 'legacy_root') all.push({ tenantId: roboConfig.tenantId, legacyMode: false }); if (roboConfig.watchAllTenants) { const tenants = await db.ref('tenants').once('value'); tenants.forEach(t => all.push({ tenantId: t.key, legacyMode: false })); }
  let best = null;
  for (const ctx of all) { const snap = await db.ref(queuePathFor(ctx)).once('value').catch(() => null); const rows = snap && snap.val() || {}; Object.values(rows).forEach(w => { const phone = strip55(w.phone || w.to || w.whatsapp); if (!phone) return; const match = rawIds.some(id => id && (strip55(id).includes(phone) || phone.includes(strip55(id)))); if (match && normalizeStatus(w.status) === 'sent') { const sentAt = Number(w.sentAt || Date.parse(w.sentAt || '') || 0); if (!best || sentAt > (best.sentAt || 0)) best = { tenantId: ctx.tenantId, legacyMode: ctx.legacyMode, supplierId: w.supplierId || w.fornecedorId, quoteId: w.quoteId || w.cotacaoId, sentAt, phone: w.phone || w.to }; } }); }
  return best;
}
async function findContext(msg, contact) { const ids = [msg.from, msg.author, contact && contact.id && contact.id.user, contact && contact.number, contact && contact.pushname].filter(Boolean); for (const id of ids) { const keys = [strip55(id), waKey(id)].filter(Boolean); for (const key of keys) { const snap = await db.ref('whatsappContacts/' + key).once('value').catch(() => null); if (snap && snap.exists()) return snap.val(); } } return contextFromQueue(ids); }
async function notifyManager(ctx, text) { const manager = roboConfig.managerPhone || ''; if (!ready || !manager) return; try { await client.sendMessage(digits(manager) + '@c.us', text); } catch (e) { lastError = e.message; } }
client.on('message', async msg => { try { if (msg.fromMe || msg.from === 'status@broadcast' || msg.isGroupMsg || !msg.body) return; let contact = null; try { contact = await msg.getContact(); } catch (_) {} const ctx = await findContext(msg, contact); const rawId = 'raw_' + Date.now(); if (!ctx || !ctx.tenantId || !ctx.quoteId || !ctx.supplierId) { await db.ref('audit/unmatchedWhatsapp/' + rawId).set({ rawId: msg.from, text: msg.body, receivedAt: now(), status: 'unmatched_global' }); await notifyManager(ctx, 'valor_IA: resposta WhatsApp não vinculada:\n' + msg.body); return; }
    const qSnap = await db.ref(refPath(ctx, 'quotes/' + ctx.quoteId)).once('value'); const cSnap = await db.ref(refPath(ctx, 'cotacoes/' + ctx.quoteId)).once('value'); const q = qSnap.val() || cSnap.val() || {}; const items = getQuoteItems(q); const lines = String(msg.body).split(/\r?\n/).map(x => x.trim()).filter(Boolean); const updates = {}; let parsed = 0;
    for (const line of lines) { const item = findItemForText(items, line) || (items.length === 1 ? items[0] : null); if (!item) continue; const unavailable = isUnavailable(line); const price = unavailable ? 0 : parsePrice(line); if (!unavailable && !price) continue; const payload = { available: !unavailable, temDisponivel: !unavailable, price, precoUnitario: price, brand: parseBrand(line), marca: parseBrand(line), brandCode: parseBrandCode(line), codigoMarca: parseBrandCode(line), desc: '', descricaoFornecedor: '', availability: parseAvailability(line), disponibilidade: parseAvailability(line), obs: unavailable ? 'interpretado como não tenho' : '', rawText: line, source: 'whatsapp', origem: 'whatsapp', updatedAt: now(), atualizadoEm: new Date().toISOString(), signature: roboConfig.signature };
      updates[refPath(ctx, 'quotes/' + ctx.quoteId + '/responses/' + ctx.supplierId + '/' + item.id)] = payload;
      if (ctx.legacyMode) updates['respostas/' + ctx.quoteId + '/' + ctx.supplierId + '/' + item.id] = payload;
      parsed++;
    }
    updates[refPath(ctx, 'quotes/' + ctx.quoteId + '/whatsappRawReplies/' + rawId)] = { supplierId: ctx.supplierId, rawId: msg.from, text: msg.body, receivedAt: now(), parsedCount: parsed };
    if (!parsed) { updates[refPath(ctx, 'audit/unmatchedWhatsapp/' + rawId)] = { rawId: msg.from, text: msg.body, receivedAt: now(), supplierId: ctx.supplierId, quoteId: ctx.quoteId, status: 'needs_manual_item' }; await notifyManager(ctx, 'valor_IA: resposta recebida, mas precisa vincular item manualmente. Cotação ' + ctx.quoteId); }
    await db.ref().update(updates); } catch (e) { lastError = e && e.message || String(e); console.error(e); await updateStatus({ status: 'Erro ao ler resposta' }); } });
client.initialize();
app.get('/', (req, res) => res.send('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="8"><title>Robô valor_IA</title><style>body{font-family:Arial;margin:30px;background:#f6f8fb;color:#17202a}.card{background:white;border:1px solid #d8e0e8;border-radius:8px;padding:18px;max-width:760px}img{max-width:320px;width:100%}.ok{color:#166534}.bad{color:#b91c1c}</style></head><body><div class="card"><h1>Robô valor_IA</h1><p class="' + (ready ? 'ok' : 'bad') + '">' + (ready ? 'WhatsApp conectado e pronto' : 'Aguardando QR Code') + '</p>' + (qrCodeData && !ready ? '<img src="' + qrCodeData + '">' : '') + '<p><b>Tenant:</b> ' + (roboConfig.legacyMode ? 'modo legado raiz' : roboConfig.tenantId) + '</p><p><b>Enviadas hoje:</b> ' + sentToday + '/' + (roboConfig.dailyLimit || 100) + '</p><p><b>Último erro:</b> ' + (lastError || '-') + '</p></div></body></html>'));
app.get('/status', (req, res) => res.json({ ready, sentToday, dayKey, lastError, config: { tenantId: roboConfig.tenantId, legacyMode: roboConfig.legacyMode, watchAllTenants: roboConfig.watchAllTenants } }));
app.listen(3010, () => console.log('Robô valor_IA em http://localhost:3010'));
