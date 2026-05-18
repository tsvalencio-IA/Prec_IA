let db = null;
let tenantId = '';
let quoteId = '';
let supplierId = '';
let legacyMode = false;
let quote = null;
let items = [];
let idx = 0;
let saved = [];
const SIGNATURE = 'Powered by thIAguinho Soluções Digitais';
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]; }); }
function parseMoney(v) { let s = String(v || '').replace(/[^\d,.-]/g, '').trim(); if (!s) return 0; if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else if (s.indexOf(',') >= 0) s = s.replace(',', '.'); return Number(s) || 0; }
function money(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function itemId(it, idx) { return it.id || it.itemId || ('item_' + idx); }
function itemCode(it) { return it.oem || it.codigoOriginal || it.codigo || it.cod || ''; }
function itemDesc(it) { return it.desc || it.descricaoOriginal || it.descricao || it.nome || ''; }
function itemQty(it) { return Number(it.qty || it.quantidade || 1) || 1; }
function getItems(q) { if (!q) return []; if (Array.isArray(q.items)) return q.items.map(function(it, i) { return Object.assign({}, it, { id: itemId(it, i) }); }); if (q.pecas && typeof q.pecas === 'object') return Object.entries(q.pecas).map(function(e, i) { return Object.assign({ id: e[0] }, e[1] || {}); }); return []; }
function publicPath() { return legacyMode ? 'publicCotacoes/' + quoteId : 'publicQuotes/' + tenantId + '/' + quoteId; }
function responseBasePath() { return legacyMode ? 'respostas/' + quoteId + '/' + supplierId : 'tenants/' + tenantId + '/quotes/' + quoteId + '/responses/' + supplierId; }
window.addEventListener('load', function() {
  firebase.initializeApp(window.firebaseConfig);
  db = firebase.database();
  const p = new URLSearchParams(location.search);
  tenantId = p.get('t') || p.get('tenantId') || 'legacy_root';
  quoteId = p.get('q') || p.get('quoteId') || p.get('cotacao') || '';
  supplierId = p.get('s') || p.get('supplierId') || p.get('fornecedor') || '';
  legacyMode = p.get('legacy') === '1' || tenantId === 'legacy_root' || !!p.get('cotacao');
  if (!quoteId || !supplierId) { block('Link inválido. Peça ao estabelecimento para reenviar a cotação.'); return; }
  loadQuote();
});
function block(text) { $('head').classList.add('hidden'); $('form').classList.add('hidden'); $('done').classList.add('hidden'); $('blocked').classList.remove('hidden'); $('blockedText').textContent = text; }
function toggleFields() { $('fields').style.display = $('disp').value === 'sim' ? 'grid' : 'none'; }
async function loadQuote() {
  let snap = await db.ref(publicPath()).once('value');
  quote = snap.val();
  if (!quote && legacyMode) quote = (await db.ref('publicCotacoes/' + quoteId).once('value')).val();
  if (!quote && !legacyMode) quote = (await db.ref('publicQuotes/' + tenantId + '/' + quoteId).once('value')).val();
  if (!quote) { block('Cotação não encontrada ou não publicada para fornecedor.'); return; }
  const st = String(quote.status || '').toLowerCase();
  if (st.indexOf('encerr') >= 0 || st.indexOf('cancel') >= 0 || st.indexOf('fech') >= 0) { block('Esta cotação está encerrada ou cancelada e não aceita respostas.'); return; }
  const v = quote.vehicle || quote.veiculo || {};
  $('title').textContent = 'Cotação ' + (quote.number || quote.numero || quoteId);
  $('sub').textContent = [v.brand || v.marca, v.model || v.modelo, v.plate || v.placa, v.chassi].filter(Boolean).join(' ');
  $('supplierPill').textContent = 'Fornecedor: ' + supplierId;
  items = getItems(quote);
  if (!items.length) { block('Cotação sem itens publicados.'); return; }
  $('form').classList.remove('hidden');
  renderItem();
}
function renderItem() {
  const it = items[idx];
  $('progress').textContent = 'Item ' + (idx + 1) + ' de ' + items.length;
  $('desc').textContent = itemDesc(it) || 'Item';
  $('meta').innerHTML = 'Código: <b>' + esc(itemCode(it) || '-') + '</b> | Qtd: <b>' + esc(itemQty(it)) + '</b><br>' + esc(it.obs || it.observacao || '');
  ['brand','brandCode','fdesc','price','availability','obs'].forEach(function(i) { $(i).value = ''; });
  $('disp').value = 'sim';
  toggleFields();
  $('nextBtn').classList.toggle('hidden', idx === items.length - 1);
  $('finishBtn').classList.toggle('hidden', idx !== items.length - 1);
}
async function saveItem(finish) {
  const it = items[idx];
  const available = $('disp').value === 'sim';
  const price = available ? parseMoney($('price').value) : 0;
  if (available && price <= 0) { alert('Informe preço válido.'); return; }
  const payload = { available: available, temDisponivel: available, brand: available ? $('brand').value : '', marca: available ? $('brand').value : '', brandCode: available ? $('brandCode').value : '', codigoMarca: available ? $('brandCode').value : '', desc: available ? $('fdesc').value : '', descricaoFornecedor: available ? $('fdesc').value : '', price: price, precoUnitario: price, availability: available ? $('availability').value : 'indisponível', disponibilidade: available ? $('availability').value : 'indisponível', obs: available ? $('obs').value : 'Fornecedor marcou como não tenho', observacao: available ? $('obs').value : 'Fornecedor marcou como não tenho', source: 'formulário', origem: 'formulário', updatedAt: Date.now(), atualizadoEm: new Date().toISOString(), supplierId: supplierId, fornecedorId: supplierId, signature: SIGNATURE };
  const updates = {};
  updates[responseBasePath() + '/' + it.id] = payload;
  if (legacyMode) updates['quotes/' + quoteId + '/responses/' + supplierId + '/' + it.id] = payload;
  updates[(legacyMode ? 'publicCotacoes/' : 'publicQuotes/' + tenantId + '/') + quoteId + '/lastResponseAt'] = Date.now();
  await db.ref().update(updates);
  saved.push({ item: itemDesc(it), available: available, brand: payload.brand, brandCode: payload.brandCode, price: payload.price, availability: payload.availability });
  if (finish || idx === items.length - 1) done(); else { idx++; renderItem(); scrollTo(0,0); }
}
function saveUnavailableAndNext() { $('disp').value = 'nao'; toggleFields(); saveItem(idx === items.length - 1); }
function done() { $('head').classList.add('hidden'); $('form').classList.add('hidden'); $('done').classList.remove('hidden'); $('protocol').textContent = 'VAL-' + Date.now().toString().slice(-8); $('recQuote').textContent = quote.number || quote.numero || quoteId; $('recDate').textContent = new Date().toLocaleString('pt-BR'); $('summary').innerHTML = '<div class="tablewrap"><table><tr><th>Item</th><th>Status</th><th>Marca</th><th>Cód. marca</th><th>Preço</th><th>Prazo</th></tr>' + saved.map(function(s) { return '<tr><td>' + esc(s.item) + '</td><td>' + (s.available ? 'Tenho' : 'Não tenho') + '</td><td>' + esc(s.brand) + '</td><td>' + esc(s.brandCode) + '</td><td>' + (s.price ? money(s.price) : '-') + '</td><td>' + esc(s.availability) + '</td></tr>'; }).join('') + '</table></div>'; }
