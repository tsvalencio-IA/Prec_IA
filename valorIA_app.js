let db = null;
let currentUser = null;
let currentTenantId = null;
let currentTenant = {};
let legacyMode = false;
let editingSupplier = null;
let editingCliente = null;
let editingVeiculo = null;
let importPreviewItems = [];
let importPreviewMeta = {};
let settings = {};
let suppliers = {};
let fornecedores = {};
let clientes = {};
let veiculos = {};
let priceDb = {};
let quotes = {};
let cotacoes = {};
let respostas = {};
let whatsappQueue = {};
let purchaseOrders = {};
let ordensCompra = {};
let unmatched = {};
let globalPrices = {};
let robotStatus = {};
let draftItems = [];
let openPanels = {};
let selectedSuppliers = {};
let scrollByQuote = {};
const SIGNATURE = 'Powered by thIAguinho Soluções Digitais';
const DEFAULT_MSG = 'Olá {fornecedor}, aqui é {estabelecimento}.\n\nCotação {cotacao} - {veiculo} {placa}\nChassi: {chassi}\nSão {qtd} item(ns).\n\nConfirme disponibilidade, marca, código da marca, descrição, preço atual e prazo pelo link:\n{link}\n\n{assinatura}';
const ROOT_NODES = ['settings','suppliers','fornecedores','priceDb','quotes','cotacoes','respostas','whatsappQueue','purchaseOrders','ordensCompra'];
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]; }); }
function money(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function parseMoney(v) { let s = String(v || '').replace(/[^\d,.-]/g, '').trim(); if (!s) return 0; if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else if (s.indexOf(',') >= 0) s = s.replace(',', '.'); return Number(s) || 0; }
function uid(p) { return p + '_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8); }
function arr(o) { return Object.entries(o || {}).map(function(entry) { return Object.assign({ id: entry[0] }, entry[1] || {}); }); }
function phoneBR(v) { let d = String(v || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d; }
function safeEmail(e) { return String(e || '').toLowerCase().replace(/[.#$\[\]]/g, '_'); }
function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
function tpath(p) { return legacyMode ? p : 'tenants/' + currentTenantId + '/' + p; }
function settingsPath() { return legacyMode ? 'settings/main' : tpath('settings'); }
function publicQuotePath(qid) { return legacyMode ? 'publicCotacoes/' + qid : 'publicQuotes/' + currentTenantId + '/' + qid; }
function supplierName(id) { return (suppliers[id] || fornecedores[id] || {}).name || (suppliers[id] || fornecedores[id] || {}).nome || id || ''; }
function supplierPhone(id) { return (suppliers[id] || fornecedores[id] || {}).phone || (suppliers[id] || fornecedores[id] || {}).whatsapp || ''; }
function normalizeDate(v) { if (!v) return ''; if (typeof v === 'number') return new Date(v).toLocaleString('pt-BR'); return String(v); }
function activeStatus(v) { return v !== false && v !== 'false' && v !== 'inativo'; }
function statusText(q) { return q.status || q.situacao || 'aberta'; }
function quoteNumber(q) { return q.number || q.numero || q.id; }
function quoteVehicle(q) { return q.vehicle || q.veiculo || {}; }
function itemId(it, idx) { return it.id || it.itemId || ('item_' + idx); }
function itemCode(it) { return it.oem || it.codigoOriginal || it.codigo || it.cod || it.altCode || ''; }
function itemDesc(it) { return it.desc || it.descricaoOriginal || it.descricao || it.nome || ''; }
function itemQty(it) { return Number(it.qty || it.quantidade || 1) || 1; }
function itemSaleUnit(it) { return Number(it.saleUnit || it.valorUnitarioPlanilha || it.precoBase || 0) || 0; }
function itemSaleTotal(it) { return Number(it.saleTotal || it.totalLiquidoPlanilha || itemSaleUnit(it) * itemQty(it) || 0) || 0; }
function getQuoteItems(q) {
  if (!q) return [];
  if (Array.isArray(q.items)) return q.items.map(function(it, idx) { return Object.assign({}, it, { id: itemId(it, idx), seq: it.seq || idx + 1 }); });
  if (q.pecas && typeof q.pecas === 'object') return Object.entries(q.pecas).map(function(entry, idx) { return Object.assign({ id: entry[0], seq: idx + 1 }, entry[1] || {}); });
  return [];
}
function allQuotes() { return arr(quotes).concat(arr(cotacoes)).reduce(function(acc, q) { if (!acc.find(function(x) { return x.id === q.id; })) acc.push(q); return acc; }, []).sort(function(a,b) { return (b.createdAt || Date.parse(b.criadaEm || '') || 0) - (a.createdAt || Date.parse(a.criadaEm || '') || 0); }); }
function allSuppliers() { return arr(suppliers).concat(arr(fornecedores).map(function(s) { return Object.assign({}, s, { name: s.name || s.nome, phone: s.phone || s.whatsapp, active: s.active !== undefined ? s.active : s.ativo }); })).reduce(function(acc, s) { if (!acc.find(function(x) { return x.id === s.id; })) acc.push(s); return acc; }, []); }
function allOrders() { return arr(purchaseOrders).concat(arr(ordensCompra)).reduce(function(acc, o) { if (!acc.find(function(x) { return x.id === o.id; })) acc.push(o); return acc; }, []).sort(function(a,b) { return (b.createdAt || Date.parse(b.criadaEm || '') || 0) - (a.createdAt || Date.parse(a.criadaEm || '') || 0); }); }
function showTab(id) { document.querySelectorAll('.tab').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === id); }); document.querySelectorAll('.tabpage').forEach(function(p) { p.classList.toggle('hidden', p.id !== id); }); }
document.querySelectorAll('.tab').forEach(function(b) { b.onclick = function() { showTab(b.dataset.tab); }; });
function applyTheme(t) { document.body.classList.toggle('theme-dark', t === 'dark'); }
window.addEventListener('load', function() {
  firebase.initializeApp(window.firebaseConfig);
  db = firebase.database();
  firebase.auth().onAuthStateChanged(async function(u) {
    currentUser = u;
    $('loginOverlay').classList.toggle('authHidden', !!u);
    if (u) await resolveTenant(u.email);
  });
  $('loginBtn').onclick = login;
  $('signupBtn').onclick = signup;
  $('logoutBtn').onclick = function() { firebase.auth().signOut(); };
});
async function login() {
  $('loginError').textContent = '';
  try { await firebase.auth().signInWithEmailAndPassword($('loginEmail').value.trim().toLowerCase(), $('loginPassword').value); }
  catch (e) { $('loginError').textContent = e.message; }
}
async function signup() {
  $('loginError').textContent = '';
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPassword').value;
  if (!email || !pass) { $('loginError').textContent = 'Informe e-mail e senha.'; return; }
  const allowed = await db.ref('tenantEmailIndex/' + safeEmail(email)).once('value');
  const legacyAllowed = await isLegacyAllowed(email);
  if (!allowed.exists() && !legacyAllowed) { $('loginError').textContent = 'E-mail ainda não cadastrado pelo admin.'; return; }
  try { await firebase.auth().createUserWithEmailAndPassword(email, pass); }
  catch (e) { $('loginError').textContent = e.message; }
}
async function isLegacyAllowed(email) {
  const key = safeEmail(email);
  const admin = await db.ref('adminEmails/' + key).once('value');
  if (admin.exists()) return true;
  const setup = await db.ref('clientSetup/adminEmail').once('value');
  if (String(setup.val() || '').toLowerCase() === String(email || '').toLowerCase()) return true;
  const sys = await db.ref('systemConfig/adminEmailKey').once('value');
  if (String(sys.val() || '') === key) return true;
  return false;
}
async function resolveTenant(email) {
  detachTenantListeners();
  const idx = await db.ref('tenantEmailIndex/' + safeEmail(email)).once('value');
  if (idx.exists() && idx.val().active !== false) {
    legacyMode = false;
    currentTenantId = idx.val().tenantId;
    currentTenant = (await db.ref('tenants/' + currentTenantId + '/meta').once('value')).val() || {};
  } else if (await isLegacyAllowed(email)) {
    legacyMode = true;
    currentTenantId = 'legacy_root';
    const s = (await db.ref('settings/main').once('value')).val() || {};
    currentTenant = { tenantId: 'legacy_root', businessName: s.name || 'Estabelecimento atual', niche: s.niche || 'oficina', managerPhone: s.managerPhone || s.phone || '', city: s.city || '', globalPriceAccess: false, globalPricePublish: false, legacyRoot: true };
  } else {
    firebase.auth().signOut();
    $('loginError').textContent = 'E-mail não autorizado.';
    return;
  }
  $('tenantPill').textContent = legacyMode ? 'modo legado: raiz atual' : 'tenant: ' + currentTenantId;
  $('brandTitle').textContent = currentTenant.businessName || currentTenant.name || 'valor_IA';
  $('brandSubtitle').textContent = (currentTenant.niche || 'oficina') + ' - banco individual';
  listenTenant();
}
function detachTenantListeners() {
  if (!db) return;
  ROOT_NODES.forEach(function(k) { db.ref(k).off(); });
  if (currentTenantId && !legacyMode) db.ref('tenants/' + currentTenantId).off();
}
function listenTenant() {
  db.ref(settingsPath()).on('value', function(s) { settings = s.val() || {}; fillSettings(); renderAll(); });
  ['suppliers','fornecedores','clientes','veiculos','priceDb','quotes','cotacoes','respostas','whatsappQueue','purchaseOrders','ordensCompra'].forEach(function(k) {
    db.ref(tpath(k)).on('value', function(s) { window[k] = s.val() || {}; renderAll(); });
  });
  db.ref(tpath('audit/unmatchedWhatsapp')).on('value', function(s) { unmatched = s.val() || {}; renderAll(); });
  db.ref(tpath('robotStatus/main')).on('value', function(s) { robotStatus = s.val() || {}; renderAll(); });
  db.ref('globalPriceDb/' + (currentTenant.niche || settings.niche || 'oficina')).limitToLast(80).on('value', function(s) { globalPrices = s.val() || {}; renderAll(); });
}
function fillSettings() {
  if (!currentTenantId) return;
  if (document.activeElement && String(document.activeElement.id || '').startsWith('set')) return;
  applyTheme(settings.theme || 'light');
  $('setName').value = settings.name || currentTenant.businessName || '';
  $('setPhone').value = settings.phone || '';
  $('setManagerPhone').value = settings.managerPhone || currentTenant.managerPhone || '';
  $('setCity').value = settings.city || currentTenant.city || '';
  $('setOwner').value = settings.owner || currentTenant.responsible || '';
  $('setTheme').value = settings.theme || 'light';
  $('setMessage').value = settings.messageTemplate || DEFAULT_MSG;
}
function saveSettings() {
  db.ref(settingsPath()).update({ name: $('setName').value, phone: $('setPhone').value, managerPhone: $('setManagerPhone').value, city: $('setCity').value, owner: $('setOwner').value, theme: $('setTheme').value, messageTemplate: $('setMessage').value || DEFAULT_MSG, niche: currentTenant.niche || settings.niche || 'oficina', updatedAt: Date.now(), signature: SIGNATURE }).then(function() { alert('Salvo.'); });
}
function renderAll() {
  if (!currentTenantId) return;
  const qlist = allQuotes();
  $('kpiOpen').textContent = qlist.filter(function(q) { return ['open','aberta','rascunho'].indexOf(String(statusText(q)).toLowerCase()) >= 0; }).length;
  $('kpiSuppliers').textContent = allSuppliers().filter(function(s) { return activeStatus(s.active); }).length;
  $('kpiPrices').textContent = Object.keys(priceDb || {}).length;
  $('kpiQueue').textContent = arr(whatsappQueue).filter(function(w) { return ['pending','sending','pendente'].indexOf(String(w.status || '').toLowerCase()) >= 0; }).length;
  $('kpiUnmatched').textContent = Object.keys(unmatched || {}).length;
  renderHome(); renderSuppliers(); renderClientes(); renderVeiculos(); renderPrices(); renderDraft(); renderQuotes(); renderWhatsapp(); renderOrders(); renderQueue(); renderDebug();
}
function renderHome() {
  $('homeQuotes').innerHTML = allQuotes().slice(0, 6).map(function(q) { return '<div class="quote"><b>' + esc(quoteNumber(q)) + '</b> - ' + esc(statusText(q)) + '<br><span class="muted">' + esc(normalizeDate(q.createdAt || q.criadaEm)) + '</span></div>'; }).join('') || '<p class="muted">Sem cotações.</p>';
  $('globalStatus').textContent = currentTenant.globalPriceAccess ? 'Liberado pelo administrador. Dados anonimizados, sem origem do estabelecimento.' : 'Não liberado pelo administrador.';
  $('globalPricesBox').innerHTML = currentTenant.globalPriceAccess ? arr(globalPrices).slice(-8).map(function(p) { return '<div class="quote"><b>' + esc(p.desc || p.descricao || '') + '</b><br>' + esc(p.brand || p.marca || '') + ' - ' + money(p.price || p.preco || 0) + '<br><span class="muted">origem anonimizada</span></div>'; }).join('') : '<p class="muted">Sem acesso global.</p>';
}
function clearSupplierForm() { editingSupplier = null; ['supName','supPhone','supTypes','supObs'].forEach(function(i) { $(i).value = ''; }); }
function saveSupplier() {
  const id = editingSupplier || uid('sup');
  const payload = { id: id, name: $('supName').value, nome: $('supName').value, phone: phoneBR($('supPhone').value), whatsapp: phoneBR($('supPhone').value), types: $('supTypes').value.split(',').map(function(x) { return x.trim(); }).filter(Boolean), tipos: $('supTypes').value.split(',').map(function(x) { return x.trim(); }).filter(Boolean), note: $('supObs').value, obs: $('supObs').value, active: true, ativo: true, updatedAt: Date.now(), signature: SIGNATURE };
  db.ref(tpath('suppliers/' + id)).update(payload).then(clearSupplierForm);
}
function editSupplier(id) { const s = suppliers[id] || fornecedores[id] || {}; editingSupplier = id; $('supName').value = s.name || s.nome || ''; $('supPhone').value = s.phone || s.whatsapp || ''; $('supTypes').value = (s.types || s.tipos || []).join(', '); $('supObs').value = s.note || s.obs || ''; showTab('fornecedores'); }
function setSupplierActive(id, active) { db.ref(tpath('suppliers/' + id)).update({ active: active, ativo: active, updatedAt: Date.now() }); }
function deleteSupplier(id) { if (confirm('Excluir fornecedor?')) db.ref(tpath('suppliers/' + id)).remove(); }
function renderSuppliers() {
  const list = allSuppliers();
  $('suppliersList').innerHTML = list.length ? '<div class="tablewrap"><table><tr><th>Nome</th><th>WhatsApp</th><th>Status</th><th>Ações</th></tr>' + list.map(function(s) { const st = activeStatus(s.active); return '<tr><td>' + esc(s.name || s.nome) + '</td><td>' + esc(s.phone || s.whatsapp) + '</td><td>' + (st ? 'Ativo' : 'Inativo') + '</td><td><button class="light" onclick="editSupplier(\'' + s.id + '\')">Editar</button> ' + (st ? '<button class="amber" onclick="setSupplierActive(\'' + s.id + '\',false)">Desativar</button>' : '<button class="green" onclick="setSupplierActive(\'' + s.id + '\',true)">Reativar</button>') + ' <button class="red" onclick="deleteSupplier(\'' + s.id + '\')">Excluir</button></td></tr>'; }).join('') + '</table></div>' : '<p class="muted">Sem fornecedores.</p>';
  $('priceSupplier').innerHTML = '<option value="">Selecione</option>' + list.map(function(s) { return '<option value="' + esc(s.id) + '">' + esc(s.name || s.nome) + '</option>'; }).join('');
}
function clearClienteForm() { editingCliente = null; ['cliNome','cliTel','cliDoc','cliEmpresa','cliResp','cliEmail','cliObs'].forEach(function(i) { $(i).value = ''; }); }
function saveCliente() { const id = editingCliente || uid('cli'); db.ref(tpath('clientes/' + id)).update({ id: id, nome: $('cliNome').value, telefone: $('cliTel').value, documento: $('cliDoc').value, empresa: $('cliEmpresa').value, responsavel: $('cliResp').value, email: $('cliEmail').value, obs: $('cliObs').value, historico: clientes[id] && clientes[id].historico || {}, updatedAt: Date.now() }).then(clearClienteForm); }
function editCliente(id) { const c = clientes[id] || {}; editingCliente = id; $('cliNome').value = c.nome || ''; $('cliTel').value = c.telefone || ''; $('cliDoc').value = c.documento || ''; $('cliEmpresa').value = c.empresa || ''; $('cliResp').value = c.responsavel || ''; $('cliEmail').value = c.email || ''; $('cliObs').value = c.obs || ''; showTab('clientes'); }
function deleteCliente(id) { if (confirm('Excluir?')) db.ref(tpath('clientes/' + id)).remove(); }
function renderClientes() { const q = ($('cliSearch') && $('cliSearch').value || '').toLowerCase(); const list = arr(clientes).filter(function(c) { return !q || [c.nome,c.telefone,c.documento,c.empresa,c.responsavel,c.email,c.obs].join(' ').toLowerCase().indexOf(q) >= 0; }); $('clientesList').innerHTML = list.length ? '<div class="tablewrap"><table><tr><th>Nome</th><th>Telefone</th><th>Empresa/órgão/frota</th><th>Responsável</th><th>Ações</th></tr>' + list.map(function(c) { return '<tr><td>' + esc(c.nome) + '</td><td>' + esc(c.telefone) + '</td><td>' + esc(c.empresa) + '</td><td>' + esc(c.responsavel) + '</td><td><button onclick="editCliente(\'' + c.id + '\')">Editar</button> <button class="red" onclick="deleteCliente(\'' + c.id + '\')">Excluir</button></td></tr>'; }).join('') + '</table></div>' : '<p class="muted">Sem clientes/referências.</p>'; }
function clearVeiculoForm() { editingVeiculo = null; ['veiPlaca','veiChassi','veiMarca','veiModelo','veiAno','veiKm','veiPrefixo','veiCliente','veiObs'].forEach(function(i) { $(i).value = ''; }); }
function saveVeiculo() { const id = editingVeiculo || uid('vei'); db.ref(tpath('veiculos/' + id)).update({ id: id, placa: $('veiPlaca').value, chassi: $('veiChassi').value, marca: $('veiMarca').value, modelo: $('veiModelo').value, ano: $('veiAno').value, km: $('veiKm').value, prefixo: $('veiPrefixo').value, cliente: $('veiCliente').value, obs: $('veiObs').value, historico: veiculos[id] && veiculos[id].historico || {}, updatedAt: Date.now() }).then(clearVeiculoForm); }
function editVeiculo(id) { const v = veiculos[id] || {}; editingVeiculo = id; $('veiPlaca').value = v.placa || ''; $('veiChassi').value = v.chassi || ''; $('veiMarca').value = v.marca || ''; $('veiModelo').value = v.modelo || ''; $('veiAno').value = v.ano || ''; $('veiKm').value = v.km || ''; $('veiPrefixo').value = v.prefixo || ''; $('veiCliente').value = v.cliente || ''; $('veiObs').value = v.obs || ''; showTab('veiculos'); }
function useVeiculo(id) { const v = veiculos[id] || {}; $('vehPlate').value = v.placa || ''; $('vehChassi').value = v.chassi || ''; $('vehBrand').value = v.marca || ''; $('vehModel').value = v.modelo || ''; $('vehYear').value = v.ano || ''; $('vehKm').value = v.km || ''; $('vehPrefix').value = v.prefixo || ''; $('vehCustomer').value = v.cliente || ''; showTab('novo'); searchVehicleHistory(); }
function deleteVeiculo(id) { if (confirm('Excluir?')) db.ref(tpath('veiculos/' + id)).remove(); }
function renderVeiculos() { const q = ($('veiSearch') && $('veiSearch').value || '').toLowerCase(); const list = arr(veiculos).filter(function(v) { return !q || [v.placa,v.chassi,v.marca,v.modelo,v.ano,v.prefixo,v.cliente,v.obs].join(' ').toLowerCase().indexOf(q) >= 0; }); $('veiculosList').innerHTML = list.length ? '<div class="tablewrap"><table><tr><th>Placa/ID</th><th>Chassi</th><th>Modelo</th><th>Prefixo</th><th>Cliente</th><th>Ações</th></tr>' + list.map(function(v) { return '<tr><td>' + esc(v.placa) + '</td><td>' + esc(v.chassi) + '</td><td>' + esc([v.marca,v.modelo,v.ano].filter(Boolean).join(' ')) + '</td><td>' + esc(v.prefixo) + '</td><td>' + esc(v.cliente) + '</td><td><button class="green" onclick="useVeiculo(\'' + v.id + '\')">Usar</button> <button onclick="editVeiculo(\'' + v.id + '\')">Editar</button> <button class="red" onclick="deleteVeiculo(\'' + v.id + '\')">Excluir</button></td></tr>'; }).join('') + '</table></div>' : '<p class="muted">Sem veículos/itens.</p>'; }
function savePrice(extra) {
  extra = extra || {};
  const id = extra.id || uid('price');
  const payload = { id: id, supplierId: extra.supplierId || $('priceSupplier').value, supplierName: extra.supplierName || supplierName(extra.supplierId || $('priceSupplier').value), oem: extra.oem || $('priceOem').value, desc: extra.desc || $('priceDesc').value, brand: extra.brand || $('priceBrand').value, brandCode: extra.brandCode || $('priceBrandCode').value, price: extra.price !== undefined ? extra.price : parseMoney($('priceValue').value), availability: extra.availability || $('priceAvailability').value, plate: extra.plate || $('pricePlate').value, chassi: extra.chassi || $('priceChassi').value, obs: extra.obs || $('priceObs').value, origin: extra.origin || 'manual', quoteId: extra.quoteId || '', orderId: extra.orderId || '', itemId: extra.itemId || '', niche: extra.niche || $('priceNiche').value || currentTenant.niche || settings.niche || 'oficina', updatedAt: Date.now(), signature: SIGNATURE };
  db.ref(tpath('priceDb/' + id)).update(payload);
  if (currentTenant.globalPricePublish) publishGlobalPrice(payload);
}
function publishGlobalPrice(payload) { const anon = { oem: payload.oem || '', desc: payload.desc || '', brand: payload.brand || '', brandCode: payload.brandCode || '', price: payload.price || 0, availability: payload.availability || '', niche: payload.niche || currentTenant.niche || 'oficina', updatedAt: Date.now(), origin: 'anon_global' }; db.ref('globalPriceDb/' + anon.niche + '/' + uid('gprice')).set(anon); }
function renderPrices() { const q = ($('priceSearch') && $('priceSearch').value || '').toLowerCase(); const list = arr(priceDb).filter(function(p) { return !q || [p.oem,p.desc,p.brand,p.brandCode,p.supplierName,supplierName(p.supplierId),p.plate,p.chassi,p.niche,p.availability,normalizeDate(p.updatedAt)].join(' ').toLowerCase().indexOf(q) >= 0; }); $('priceList').innerHTML = list.length ? '<div class="tablewrap"><table><tr><th>Item</th><th>Fornecedor</th><th>Marca</th><th>Preço</th><th>Placa/Chassi</th><th>Histórico</th><th>Ação</th></tr>' + list.map(function(p) { return '<tr><td><b>' + esc(p.desc) + '</b><br>' + esc(p.oem) + '</td><td>' + esc(p.supplierName || supplierName(p.supplierId)) + '</td><td>' + esc(p.brand || '') + '<br>' + esc(p.brandCode || '') + '</td><td>' + money(p.price) + '</td><td>' + esc(p.plate || '') + '<br>' + esc(p.chassi || '') + '</td><td>' + esc(p.origin || '') + '<br>' + esc(normalizeDate(p.updatedAt)) + '</td><td><button onclick="addPriceToDraft(\'' + p.id + '\')">Usar em cotação</button> <button onclick="loadPriceToForm(\'' + p.id + '\')">Atualizar</button></td></tr>'; }).join('') + '</table></div>' : '<p class="muted">Sem preços.</p>'; }
function loadPriceToForm(id) { const p = priceDb[id] || {}; $('priceSupplier').value = p.supplierId || ''; $('priceOem').value = p.oem || ''; $('priceDesc').value = p.desc || ''; $('priceBrand').value = p.brand || ''; $('priceBrandCode').value = p.brandCode || ''; $('priceValue').value = p.price || ''; $('priceAvailability').value = p.availability || ''; $('pricePlate').value = p.plate || ''; $('priceChassi').value = p.chassi || ''; $('priceNiche').value = p.niche || ''; $('priceObs').value = p.obs || ''; showTab('precos'); }
function addPriceToDraft(id) { const p = priceDb[id]; if (!p) return; draftItems.push({ id: uid('item'), oem: p.oem, altCode: p.brandCode || '', desc: p.desc, qty: 1, saleUnit: p.price || 0, saleTotal: p.price || 0, type: p.niche || 'geral', obs: 'banco de preços', priceHistoryId: id }); renderDraft(); showTab('novo'); }
function addDraftItem() { const desc = $('itemDesc').value.trim(); if (!desc) { alert('Descrição obrigatória.'); return; } const qty = parseMoney($('itemQty').value) || 1; const unit = parseMoney($('itemSale').value); draftItems.push({ id: uid('item'), oem: $('itemOem').value, altCode: $('itemAlt').value, desc: desc, qty: qty, saleUnit: unit, saleTotal: unit * qty, type: $('itemType').value, obs: $('itemObs').value }); renderDraft(); }
function renderDraft() { if (!$('draftItems')) return; $('draftItems').innerHTML = draftItems.length ? '<div class="tablewrap"><table><tr><th>Código</th><th>Descrição</th><th>Qtd</th><th>Base</th><th>Ações</th></tr>' + draftItems.map(function(i, idx) { return '<tr><td>' + esc(i.oem) + '</td><td>' + esc(i.desc) + '<br><span class="muted">' + esc(i.obs || '') + '</span></td><td>' + esc(i.qty) + '</td><td>' + money(i.saleTotal) + '</td><td><button onclick="editDraftItem(' + idx + ')">Editar</button> <button class="red" onclick="draftItems.splice(' + idx + ',1);renderDraft()">Remover</button></td></tr>'; }).join('') + '</table></div>' : '';
}
function editDraftItem(idx) { const i = draftItems[idx]; if (!i) return; $('itemOem').value = i.oem || ''; $('itemAlt').value = i.altCode || ''; $('itemDesc').value = i.desc || ''; $('itemQty').value = i.qty || 1; $('itemSale').value = i.saleUnit || ''; $('itemType').value = i.type || ''; $('itemObs').value = i.obs || ''; draftItems.splice(idx, 1); renderDraft(); }
function clearQuoteForm() { draftItems = []; ['quoteNumber','vehCustomer','vehPlate','vehChassi','vehBrand','vehModel','vehYear','vehKm','vehPrefix','vehObs','itemOem','itemAlt','itemDesc','itemQty','itemSale','itemType','itemObs'].forEach(function(i) { if ($(i)) $(i).value = ''; }); $('itemQty').value = '1'; renderDraft(); }
function saveQuote(status) {
  if (!draftItems.length) { alert('Adicione itens.'); return; }
  const id = uid('quote');
  const vehicle = { customer: $('vehCustomer').value, plate: $('vehPlate').value, chassi: $('vehChassi').value, brand: $('vehBrand').value, model: $('vehModel').value, year: $('vehYear').value, km: $('vehKm').value, prefix: $('vehPrefix').value, obs: $('vehObs').value };
  const q = { id: id, number: $('quoteNumber').value || id, status: status, vehicle: vehicle, niche: currentTenant.niche || settings.niche || 'oficina', items: draftItems.map(function(x, i) { return Object.assign({}, x, { seq: i + 1 }); }), createdAt: Date.now(), updatedAt: Date.now(), origin: 'manual', signature: SIGNATURE };
  const updates = {}; updates[tpath('quotes/' + id)] = q; updates[publicQuotePath(id)] = sanitizePublicQuote(q);
  db.ref().update(updates).then(function() { clearQuoteForm(); showTab('cotacoes'); });
}
function sanitizePublicQuote(q) { const v = quoteVehicle(q); return { id: q.id, number: q.number || q.numero || q.id, status: q.status, tenantId: currentTenantId, niche: q.niche || currentTenant.niche || 'oficina', vehicle: { customer: v.customer || v.cliente || '', plate: v.plate || v.placa || '', chassi: v.chassi || '', brand: v.brand || v.marca || '', model: v.model || v.modelo || '', year: v.year || v.ano || '', km: v.km || '', prefix: v.prefix || v.prefixo || '' }, items: getQuoteItems(q).map(function(it, idx) { return { id: itemId(it, idx), seq: idx + 1, oem: itemCode(it), desc: itemDesc(it), qty: itemQty(it), obs: it.obs || it.observacao || '' }; }), createdAt: q.createdAt || Date.now(), signature: SIGNATURE } }
async function importXlsx() {
  const file = $('fileXlsx').files[0];
  if (!file) { alert('Escolha a planilha ou PDF.'); return; }
  importPreviewItems = [];
  importPreviewMeta = {};
  $('importPreview').innerHTML = '<p class="muted">Lendo arquivo e filtrando somente peças...</p>';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  try {
    if (ext === 'pdf') {
      const text = await readPdfText(file);
      const parsed = parseImportedText(text, file.name);
      importPreviewItems = parsed.items;
      importPreviewMeta = parsed.meta;
    } else {
      const rows = await readSpreadsheetRows(file);
      const parsed = parseImportedRows(rows, file.name);
      importPreviewItems = parsed.items;
      importPreviewMeta = parsed.meta;
    }
    renderImportPreview();
  } catch (e) {
    console.error(e);
    $('importPreview').innerHTML = '<p class="bad">Falha ao ler arquivo: ' + esc(e.message || e) + '</p>';
  }
}
function readSpreadsheetRows(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        let rows = [];
        wb.SheetNames.forEach(function(n) {
          rows = rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false }));
        });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = function() { reject(reader.error || new Error('Não foi possível ler a planilha.')); };
    reader.readAsArrayBuffer(file);
  });
}
async function readPdfText(file) {
  if (!window.pdfjsLib) throw new Error('Leitor PDF não carregado.');
  if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: data }).promise;
  let pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines = {};
    content.items.forEach(function(it) {
      const y = Math.round((it.transform && it.transform[5] || 0) / 3) * 3;
      lines[y] = lines[y] || [];
      lines[y].push({ x: it.transform && it.transform[4] || 0, text: it.str || '' });
    });
    Object.keys(lines).sort(function(a,b) { return Number(b) - Number(a); }).forEach(function(y) {
      pages.push(lines[y].sort(function(a,b) { return a.x - b.x; }).map(function(i) { return i.text; }).join(' ').replace(/\s+/g, ' ').trim());
    });
  }
  return pages.join('\n');
}
function normalizeImportText(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function isServiceLike(text) { const t = normalizeImportText(text); return /SERVICO|MAO DE OBRA|MÃO DE OBRA|TMO|HORA|GUINCHO|DESLOCAMENTO|REMOVER|INSTALAR|SUBSTITUIR|LIMPAR|VISTORIA|FRANQUIA/.test(t); }
function isStopSection(text) { const t = normalizeImportText(text); return /TOTAL DE PECAS|TOTAL DE PEÇAS|COMPOSICAO DA O\.?S|COMPOSIÇÃO DA O\.?S|KPIS FINAIS|TOTAL GERAL|RESUMO POR SECAO/.test(t); }
function isPartsHeader(text) { const t = normalizeImportText(text); return /GRADE/.test(t) && (/CODIGO DA PECA|CÓDIGO DA PEÇA|CODIGO ORIGINAL/.test(t)); }
function isHeaderLike(text) { const t = normalizeImportText(text); return /DESCRICAO|DESCRIÇÃO|VALOR|QTD|QUANTIDADE|CODIGO|CÓDIGO|GRADE|TOTAL/.test(t); }
function isPartCode(v) { const s = String(v || '').trim().toUpperCase(); if (!s || /^\d+([,.]\d+)?$/.test(s) && s.length < 7) return false; return /^[A-Z0-9][A-Z0-9.\/-]{4,18}$/.test(s) && /\d/.test(s); }
function extractImportMetaFromText(text) {
  const meta = {};
  const one = String(text || '').replace(/\s+/g, ' ');
  function pick(key, rx) { const m = one.match(rx); if (m && m[1]) meta[key] = m[1].trim(); }
  pick('brand', /MARCA\s*:\s*([^|:\n]{1,40})(?:\s+MODELO|\s*\||$)/i);
  pick('model', /MODELO\s*:\s*([^|:\n]{1,60})(?:\s+ANO|\s*\||$)/i);
  pick('year', /ANO\s*:\s*([0-9]{4})/i);
  pick('plate', /PLACA\s*:\s*([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}[0-9]{4})/i);
  pick('chassi', /CHASSI[S]?\s*:\s*([A-Z0-9]{5,30})/i);
  pick('km', /\bKM\s*:\s*([0-9.,]+)/i);
  pick('prefix', /PREFIXO\s*:\s*([A-Z0-9.\-\/]+)/i);
  pick('customer', /DADOS DO CLIENTE\s+UNIDADE\s*:\s*([^|:\n]{2,80})(?:\s+CNPJ|\s*\||$)/i);
  pick('customerDoc', /DADOS DO CLIENTE[\s\S]{0,120}?CNPJ\s*:\s*([0-9.\/-]{14,18})/i);
  pick('shopName', /RAZAO SOCIAL\s*:\s*([^|:\n]{2,90})(?:\s+CNPJ|\s*\||$)/i);
  return meta;
}
function parseImportedRows(rows, fileName) {
  const allText = rows.map(function(r) { return (r || []).join(' | '); }).join('\n');
  const meta = extractImportMetaFromText(allText);
  const out = [];
  let inParts = false;
  rows.forEach(function(r, idx) {
    const cells = (r || []).map(function(x) { return String(x || '').trim(); }).filter(function(x) { return x && x !== 'System.Xml.XmlElement'; });
    const text = cells.join(' | ');
    if (!text.trim()) return;
    if (isPartsHeader(text)) { inParts = true; return; }
    if (inParts && isStopSection(text)) { inParts = false; return; }
    if (!inParts) return;
    if (isServiceLike(text) || isHeaderLike(text)) return;
    const codeIndexes = [];
    cells.forEach(function(c, i) { if (isPartCode(c)) codeIndexes.push(i); });
    if (!codeIndexes.length) return;
    const code = cells[codeIndexes[0]];
    const altCode = codeIndexes.length > 1 ? cells[codeIndexes[1]] : '';
    const descIndex = cells.findIndex(function(c, i) { return i > codeIndexes[0] && i !== codeIndexes[1] && c.length > 3 && !isPartCode(c) && !/^[0-9.,]+$/.test(c) && !isServiceLike(c); });
    const desc = descIndex >= 0 ? cells[descIndex] : '';
    if (!desc) return;
    const nums = cells.slice(descIndex + 1).filter(function(c) { return /^R?\$?\s*[0-9.,]+$/.test(c); }).map(parseMoney).filter(function(n) { return n > 0; });
    const qty = nums.find(function(n) { return n > 0 && n <= 99 && Number.isInteger(Math.round(n)); }) || 1;
    const values = nums.filter(function(n) { return n > 0 && n !== qty && n !== 0.15 && n !== 15; });
    const unit = values[0] || 0;
    const total = values.length ? values[values.length - 1] : unit * qty;
    out.push({ id: uid('item'), oem: code, altCode: altCode, desc: desc, qty: qty, saleUnit: unit, saleTotal: total, type: 'peca_importada', line: idx + 1, sourceFile: fileName || '' });
  });
  return { items: dedupeImportedItems(out), meta: meta };
}
function parseImportedText(text, fileName) {
  const meta = extractImportMetaFromText(text);
  const rows = String(text || '').split(/\r?\n/).map(function(line) { return line.split(/\s{2,}|\s+\|\s+|;/).filter(Boolean); });
  let parsed = parseImportedRows(rows, fileName);
  if (parsed.items.length) return { items: parsed.items, meta: Object.assign(meta, parsed.meta || {}) };
  const out = [];
  String(text || '').split(/\r?\n/).forEach(function(line, idx) {
    if (isServiceLike(line) || isHeaderLike(line) || isStopSection(line)) return;
    const m = line.match(/\b([A-Z0-9][A-Z0-9.\/-]{4,18})\b\s+(?:([A-Z0-9][A-Z0-9.\/-]{4,18})\s+)?(.+?)\s+([0-9]+)\s+(?:R\$\s*)?([0-9.,]+)/i);
    if (!m || !isPartCode(m[1])) return;
    const desc = (m[3] || '').trim();
    if (!desc || isServiceLike(desc)) return;
    const qty = parseMoney(m[4]) || 1;
    const total = parseMoney(m[5]);
    out.push({ id: uid('item'), oem: m[1], altCode: isPartCode(m[2]) ? m[2] : '', desc: desc, qty: qty, saleUnit: total ? total / qty : 0, saleTotal: total, type: 'peca_importada_pdf', line: idx + 1, sourceFile: fileName || '' });
  });
  return { items: dedupeImportedItems(out), meta: meta };
}
function dedupeImportedItems(items) {
  const seen = {};
  return items.filter(function(i) {
    const key = normalizeImportText(i.oem + '|' + i.desc);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
function renderImportPreview() {
  const meta = importPreviewMeta || {};
  const metaHtml = Object.keys(meta).length ? '<div class="quote"><b>Dados detectados</b><br>Cliente: ' + esc(meta.customer || '') + '<br>Placa: ' + esc(meta.plate || '') + ' | Chassi: ' + esc(meta.chassi || '') + ' | Modelo: ' + esc([meta.brand, meta.model, meta.year].filter(Boolean).join(' ')) + ' | KM: ' + esc(meta.km || '') + ' | Prefixo: ' + esc(meta.prefix || '') + '</div>' : '';
  $('importPreview').innerHTML = importPreviewItems.length ? '<p class="ok">' + importPreviewItems.length + ' peça(s) lida(s). Serviços e mão de obra foram ignorados.</p>' + metaHtml + '<div class="tablewrap"><table><tr><th>Linha</th><th>Código original</th><th>Código alternativo</th><th>Descrição da peça</th><th>Qtd</th><th>Valor</th></tr>' + importPreviewItems.map(function(i) { return '<tr><td>' + i.line + '</td><td>' + esc(i.oem) + '</td><td>' + esc(i.altCode || '') + '</td><td>' + esc(i.desc) + '</td><td>' + esc(i.qty) + '</td><td>' + money(i.saleTotal) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="bad">Nenhuma peça válida encontrada. O importador só aceita linhas da seção de peças com código original.</p>' + metaHtml;
}
function acceptImportPreview() {
  if (!importPreviewItems.length) { alert('Leia a planilha/PDF primeiro.'); return; }
  const m = importPreviewMeta || {};
  if (m.customer && !$('vehCustomer').value) $('vehCustomer').value = m.customer;
  if (m.plate && !$('vehPlate').value) $('vehPlate').value = m.plate;
  if (m.chassi && !$('vehChassi').value) $('vehChassi').value = m.chassi;
  if (m.brand && !$('vehBrand').value) $('vehBrand').value = m.brand;
  if (m.model && !$('vehModel').value) $('vehModel').value = m.model;
  if (m.year && !$('vehYear').value) $('vehYear').value = m.year;
  if (m.km && !$('vehKm').value) $('vehKm').value = m.km;
  if (m.prefix && !$('vehPrefix').value) $('vehPrefix').value = m.prefix;
  draftItems = draftItems.concat(importPreviewItems);
  importPreviewItems = [];
  importPreviewMeta = {};
  renderDraft();
  $('importPreview').innerHTML = '<p class="ok">Peças e dados de veículo/cliente enviados para Novo orçamento.</p>';
  showTab('novo');
}
function responsesFor(q, item) {
  const iid = item.id;
  const out = [];
  Object.entries(q.responses || {}).forEach(function(entry) { const sid = entry[0], items = entry[1] || {}; const r = items[iid]; if (r) out.push(normalizeResponse(sid, r)); });
  if (respostas[q.id]) Object.entries(respostas[q.id] || {}).forEach(function(entry) { const sid = entry[0], items = entry[1] || {}; const r = items[iid]; if (r && !out.find(function(x) { return x.supplierId === sid && x.itemId === iid; })) out.push(normalizeResponse(sid, r)); });
  return out.sort(function(a,b) { const ap = a.available && a.price > 0 ? a.price : 999999999; const bp = b.available && b.price > 0 ? b.price : 999999999; return ap - bp; });
}
function normalizeResponse(sid, r) { return { supplierId: sid, supplier: r.supplierName || r.fornecedorNome || supplierName(sid), available: r.available !== undefined ? r.available !== false : r.temDisponivel !== false, brand: r.brand || r.marca || '', brandCode: r.brandCode || r.codigoMarca || '', desc: r.desc || r.descricaoFornecedor || '', price: Number(r.price || r.precoUnitario || 0), availability: r.availability || r.disponibilidade || '', obs: r.obs || r.observacao || '', raw: r.rawText || r.raw || r.text || '', source: r.source || r.origem || 'formulário', updatedAt: r.updatedAt || Date.parse(r.atualizadoEm || '') || 0 }; }
function bestFor(q, item) { return responsesFor(q, item).filter(function(r) { return r.available && r.price > 0; })[0] || null; }
function countResponded(q) { return getQuoteItems(q).filter(function(i) { return responsesFor(q, i).length; }).length; }
function renderQuotes() {
  const list = allQuotes();
  $('quotesList').innerHTML = list.length ? list.map(function(q) {
    const items = getQuoteItems(q); const v = quoteVehicle(q); const responded = countResponded(q); const mode = openPanels[q.id] || ''; const profit = estimateProfit(q);
    return '<div class="quote" id="quote_' + esc(q.id) + '"><h3>' + esc(quoteNumber(q)) + ' <span class="pill">' + esc(statusText(q)) + '</span></h3><div class="metricLine"><span class="pill">nicho: ' + esc(q.niche || currentTenant.niche || settings.niche || 'oficina') + '</span><span class="pill">cliente: ' + esc(v.customer || v.cliente || '') + '</span><span class="pill">placa: ' + esc(v.plate || v.placa || '') + '</span><span class="pill">chassi: ' + esc(v.chassi || '') + '</span><span class="pill">itens: ' + items.length + '</span><span class="pill">respondidos: ' + responded + '</span><span class="pill">sem resposta: ' + Math.max(items.length - responded, 0) + '</span><span class="pill">lucro estimado: ' + money(profit) + '</span><span class="pill">origem: ' + esc(q.origin || q.arquivo || 'manual') + '</span></div><div class="actions"><button onclick="openQuotePanel(\'' + q.id + '\',\'compare\')">Comparar respostas</button><button class="light" onclick="openQuotePanel(\'' + q.id + '\',\'items\')">Ver peças</button><button class="light" onclick="openQuotePanel(\'' + q.id + '\',\'raw\')">Ver respostas WhatsApp</button><button class="light" onclick="openQuotePanel(\'' + q.id + '\',\'send\')">Enviar fornecedores</button><button class="green" onclick="generateOC(\'' + q.id + '\')">Gerar OC</button><button onclick="editQuote(\'' + q.id + '\')">Editar</button><button class="amber" onclick="setQuoteStatus(\'' + q.id + '\',\'encerrada\')">Encerrar</button><button class="red" onclick="setQuoteStatus(\'' + q.id + '\',\'cancelada\')">Cancelar</button><button class="green" onclick="setQuoteStatus(\'' + q.id + '\',\'aberta\')">Reabrir</button><button class="red" onclick="deleteQuote(\'' + q.id + '\')">Excluir</button><button class="light" onclick="exportComparativo(\'' + q.id + '\')">Exportar comparativo</button></div>' + renderQuotePanel(q, mode) + '</div>';
  }).join('') : '<p class="muted">Sem cotações.</p>';
}
function openQuotePanel(id, mode) { scrollByQuote[id] = window.scrollY; selectedSuppliers[id] = selectedSuppliers[id] || []; openPanels[id] = openPanels[id] === mode ? '' : mode; renderQuotes(); setTimeout(function() { if (scrollByQuote[id] != null) window.scrollTo(0, scrollByQuote[id]); }, 0); }
function renderQuotePanel(q, mode) { if (!mode) return ''; if (mode === 'items') return '<div class="card">' + getQuoteItems(q).map(function(i, idx) { return '<div class="quote"><b>' + esc(itemDesc(i)) + '</b><br>Código: ' + esc(itemCode(i)) + ' | Qtd: ' + esc(itemQty(i)) + ' | Base: ' + money(itemSaleTotal(i)) + '<br>' + esc(i.obs || i.observacao || '') + '</div>'; }).join('') + '</div>'; if (mode === 'compare') return renderCompare(q); if (mode === 'send') return renderSendPanel(q); if (mode === 'raw') return renderRawReplies(q); return ''; }
function renderCompare(q) { return '<div class="card">' + getQuoteItems(q).map(function(i) { const rs = responsesFor(q, i); const best = rs.filter(function(r) { return r.available && r.price > 0; })[0]; return '<div class="quote"><h3>' + esc(itemDesc(i)) + '</h3><p class="muted">Código: ' + esc(itemCode(i)) + ' | Qtd: ' + esc(itemQty(i)) + ' | Preço base: ' + money(itemSaleTotal(i)) + '</p>' + (rs.length ? '<div class="tablewrap"><table><tr><th>Fornecedor</th><th>Tem</th><th>Marca</th><th>Cód. marca</th><th>Descrição fornecedor</th><th>Unitário</th><th>Total</th><th>Prazo</th><th>Origem</th><th>Resposta bruta</th></tr>' + rs.map(function(r) { return '<tr class="' + (best && best.supplierId === r.supplierId ? 'best' : '') + '"><td>' + esc(r.supplier) + '</td><td>' + (r.available ? 'Tem' : 'Não tem') + '</td><td>' + esc(r.brand) + '</td><td>' + esc(r.brandCode) + '</td><td>' + esc(r.desc) + '</td><td>' + money(r.price) + '</td><td>' + money(r.price * itemQty(i)) + '</td><td>' + esc(r.availability) + '</td><td>' + esc(r.source) + '</td><td>' + esc(r.raw || r.obs) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="bad">Item sem resposta.</p>') + '</div>'; }).join('') + '</div>'; }
function renderSendPanel(q) { const sups = allSuppliers().filter(function(s) { return activeStatus(s.active); }); return '<div class="card"><h3>Enviar fornecedores</h3><div class="supplierChecks">' + sups.map(function(s) { return '<label><input type="checkbox" class="send_' + esc(q.id) + '" value="' + esc(s.id) + '"> ' + esc(s.name || s.nome) + ' - ' + esc(s.phone || s.whatsapp) + '</label>'; }).join('') + '</div><div class="actions"><button onclick="enqueueSelected(\'' + q.id + '\')">Enviar selecionados</button></div></div>'; }
function renderRawReplies(q) { const raws = arr(q.whatsappRawReplies || q.rawWhatsapp || {}); return '<div class="card">' + (raws.length ? raws.map(function(r) { return '<pre>' + esc(r.text || r.raw || '') + '</pre>'; }).join('') : '<p class="muted">Sem respostas brutas vinculadas.</p>') + '</div>'; }
function estimateProfit(q) { return getQuoteItems(q).reduce(function(total, it) { const b = bestFor(q, it); if (!b) return total; return total + Math.max(0, itemSaleTotal(it) - b.price * itemQty(it)); }, 0); }
function enqueueSelected(qid) { const q = quotes[qid] || cotacoes[qid]; const checks = Array.prototype.slice.call(document.querySelectorAll('.send_' + qid + ':checked')); if (!checks.length) { alert('Selecione fornecedor.'); return; } const updates = {}; checks.forEach(function(c) { const s = suppliers[c.value] || fornecedores[c.value] || {}; const id = uid('wa'); const link = location.origin + location.pathname.replace(/index\.html.*$/, '') + 'fornecedor.html?t=' + encodeURIComponent(currentTenantId) + '&q=' + encodeURIComponent(qid) + '&s=' + encodeURIComponent(c.value) + (legacyMode ? '&legacy=1' : ''); const v = quoteVehicle(q); const msg = (settings.messageTemplate || DEFAULT_MSG).replaceAll('{fornecedor}', s.name || s.nome || '').replaceAll('{estabelecimento}', settings.name || currentTenant.businessName || '').replaceAll('{cotacao}', quoteNumber(q)).replaceAll('{veiculo}', v.model || v.modelo || '').replaceAll('{placa}', v.plate || v.placa || '').replaceAll('{chassi}', v.chassi || '').replaceAll('{qtd}', getQuoteItems(q).length).replaceAll('{link}', link).replaceAll('{assinatura}', SIGNATURE); updates[tpath('whatsappQueue/' + id)] = { id: id, tenantId: currentTenantId, legacyMode: legacyMode, quoteId: qid, cotacaoId: qid, quoteNumber: quoteNumber(q), supplierId: c.value, fornecedorId: c.value, supplierName: s.name || s.nome || '', fornecedorNome: s.name || s.nome || '', phone: s.phone || s.whatsapp || '', to: s.phone || s.whatsapp || '', message: msg, status: 'pending', createdAt: Date.now(), signature: SIGNATURE }; updates['whatsappContacts/' + onlyDigits(s.phone || s.whatsapp).replace(/^55/, '')] = { supplierId: c.value, phone: s.phone || s.whatsapp || '', lastQuoteId: qid, tenantId: currentTenantId, legacyMode: legacyMode, mappedAt: Date.now() }; }); db.ref().update(updates).then(function() { alert('Mensagens adicionadas à fila do robô.'); }); }
function setQuoteStatus(id, status) { const path = quotes[id] ? tpath('quotes/' + id + '/status') : tpath('cotacoes/' + id + '/status'); db.ref(path).set(status); db.ref(publicQuotePath(id) + '/status').set(status); }
function editQuote(id) { const q = quotes[id] || cotacoes[id]; if (!q) return; const v = quoteVehicle(q); $('quoteNumber').value = quoteNumber(q); $('vehCustomer').value = v.customer || v.cliente || ''; $('vehPlate').value = v.plate || v.placa || ''; $('vehChassi').value = v.chassi || ''; $('vehBrand').value = v.brand || v.marca || ''; $('vehModel').value = v.model || v.modelo || ''; $('vehYear').value = v.year || v.ano || ''; $('vehKm').value = v.km || ''; $('vehPrefix').value = v.prefix || v.prefixo || ''; $('vehObs').value = v.obs || ''; draftItems = getQuoteItems(q).map(function(i) { return { id: uid('item'), oem: itemCode(i), desc: itemDesc(i), qty: itemQty(i), saleUnit: itemSaleUnit(i), saleTotal: itemSaleTotal(i), type: i.type || i.tipo || '', obs: i.obs || i.observacao || '' }; }); renderDraft(); showTab('novo'); }
function deleteQuote(id) { if (!confirm('Excluir cotação?')) return; const updates = {}; updates[tpath('quotes/' + id)] = null; updates[tpath('cotacoes/' + id)] = null; updates[publicQuotePath(id)] = null; db.ref().update(updates); }
function exportComparativo(qid) { const q = quotes[qid] || cotacoes[qid]; if (!q) return; const rows = [['Cotação', quoteNumber(q)], ['Item','Código','Qtd','Fornecedor','Tem','Marca','Código marca','Preço unitário','Total','Prazo','Origem','Bruto']]; getQuoteItems(q).forEach(function(i) { const rs = responsesFor(q, i); if (!rs.length) rows.push([itemDesc(i), itemCode(i), itemQty(i), 'SEM RESPOSTA']); rs.forEach(function(r) { rows.push([itemDesc(i), itemCode(i), itemQty(i), r.supplier, r.available ? 'Tem' : 'Não tem', r.brand, r.brandCode, r.price, r.price * itemQty(i), r.availability, r.source, r.raw || r.obs]); }); }); const csv = rows.map(function(row) { return row.map(function(c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'); downloadText('comparativo_' + quoteNumber(q).replace(/\W+/g, '_') + '.csv', csv); }
function generateOC(qid) { const q = quotes[qid] || cotacoes[qid]; if (!q) return; const updates = {}; const grouped = {}; getQuoteItems(q).forEach(function(it) { const b = bestFor(q, it); if (b) { grouped[b.supplierId] = grouped[b.supplierId] || []; grouped[b.supplierId].push({ item: it, best: b }); } }); Object.entries(grouped).forEach(function(entry) { const sid = entry[0], rows = entry[1]; const ocid = uid('oc'); const total = rows.reduce(function(s, r) { return s + r.best.price * itemQty(r.item); }, 0); const profit = rows.reduce(function(s, r) { return s + Math.max(0, itemSaleTotal(r.item) - r.best.price * itemQty(r.item)); }, 0); updates[tpath('purchaseOrders/' + ocid)] = { id: ocid, quoteId: qid, quoteNumber: quoteNumber(q), supplierId: sid, supplierName: supplierName(sid), total: total, profit: profit, status: 'aberta', createdAt: Date.now(), items: rows.map(function(r) { return { itemId: r.item.id, desc: itemDesc(r.item), oem: itemCode(r.item), qty: itemQty(r.item), brand: r.best.brand, brandCode: r.best.brandCode, priceUnit: r.best.price, total: r.best.price * itemQty(r.item), availability: r.best.availability, obs: r.best.obs }; }), signature: SIGNATURE };
    rows.forEach(function(r) { const pid = uid('price'); const payload = { id: pid, supplierId: sid, supplierName: supplierName(sid), desc: itemDesc(r.item), oem: itemCode(r.item), brand: r.best.brand, brandCode: r.best.brandCode, price: r.best.price, availability: r.best.availability, origin: 'OC', quoteId: qid, orderId: ocid, itemId: r.item.id, plate: (quoteVehicle(q).plate || quoteVehicle(q).placa || ''), chassi: quoteVehicle(q).chassi || '', niche: q.niche || currentTenant.niche || settings.niche || 'oficina', updatedAt: Date.now(), signature: SIGNATURE }; updates[tpath('priceDb/' + pid)] = payload; if (currentTenant.globalPricePublish) updates['globalPriceDb/' + payload.niche + '/' + uid('gprice')] = { oem: payload.oem, desc: payload.desc, brand: payload.brand, brandCode: payload.brandCode, price: payload.price, availability: payload.availability, niche: payload.niche, updatedAt: payload.updatedAt, origin: 'anon_global' }; }); });
  if (!Object.keys(updates).length) { alert('Não há respostas com preço para gerar OC.'); return; }
  db.ref().update(updates).then(function() { showTab('compras'); });
}
function renderOrders() { const list = allOrders(); $('ordersList').innerHTML = list.length ? list.map(function(o) { const items = o.items || o.itens || []; const total = o.total || o.totalCompra || 0; return '<div class="quote"><h3>OC ' + esc(o.id) + ' <span class="pill">' + esc(o.status || '') + '</span></h3><p>' + esc(o.supplierName || o.fornecedorNome || '') + ' - ' + money(total) + ' | lucro estimado: ' + money(o.profit || o.lucroTotal || 0) + '</p><div class="tablewrap"><table><tr><th>Item</th><th>Marca</th><th>Cód. marca</th><th>Qtd</th><th>Unitário</th><th>Total</th><th>Disponibilidade</th><th>Obs</th></tr>' + items.map(function(i) { return '<tr><td>' + esc(i.desc || i.descricao || '') + '<br>' + esc(i.oem || i.codigoOriginal || '') + '</td><td>' + esc(i.brand || i.marca || '') + '</td><td>' + esc(i.brandCode || i.codigoMarca || '') + '</td><td>' + esc(i.qty || i.quantidade || '') + '</td><td>' + money(i.priceUnit || i.precoUnitario || 0) + '</td><td>' + money(i.total || 0) + '</td><td>' + esc(i.availability || i.disponibilidade || '') + '</td><td>' + esc(i.obs || i.observacao || '') + '</td></tr>'; }).join('') + '</table></div><div class="actions"><button onclick="exportOrder(\'' + o.id + '\')">Exportar XLSX/CSV</button><button onclick="window.print()">Imprimir</button><button onclick="sendOrderToSupplier(\'' + o.id + '\')">Enviar pedido ao fornecedor</button><button class="green" onclick="setOCStatus(\'' + o.id + '\',\'comprada\')">Marcar comprada</button><button class="green" onclick="setOCStatus(\'' + o.id + '\',\'recebida\')">Marcar recebida</button><button class="amber" onclick="setOCStatus(\'' + o.id + '\',\'cancelada\')">Cancelar OC</button><button class="red" onclick="deleteOC(\'' + o.id + '\')">Excluir OC</button></div></div>'; }).join('') : '<p class="muted">Sem ordens de compra.</p>'; }
function setOCStatus(id, status) { const base = purchaseOrders[id] ? tpath('purchaseOrders/' + id) : tpath('ordensCompra/' + id); db.ref(base).update({ status: status, updatedAt: Date.now() }); }
function deleteOC(id) { if (!confirm('Excluir OC?')) return; const updates = {}; updates[tpath('purchaseOrders/' + id)] = null; updates[tpath('ordensCompra/' + id)] = null; db.ref().update(updates); }
function exportOrder(id) { const o = purchaseOrders[id] || ordensCompra[id]; if (!o) return; const rows = [['OC', id], ['Fornecedor', o.supplierName || o.fornecedorNome || ''], ['Item','Marca','Código marca','Qtd','Unitário','Total','Disponibilidade','Obs']]; (o.items || o.itens || []).forEach(function(i) { rows.push([i.desc || i.descricao || '', i.brand || i.marca || '', i.brandCode || i.codigoMarca || '', i.qty || i.quantidade || '', i.priceUnit || i.precoUnitario || 0, i.total || 0, i.availability || i.disponibilidade || '', i.obs || i.observacao || '']); }); downloadText('OC_' + id + '.csv', rows.map(function(r) { return r.map(function(c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n')); }
function sendOrderToSupplier(id) { const o = purchaseOrders[id] || ordensCompra[id]; if (!o) return; const sid = o.supplierId || o.fornecedorId; const phone = supplierPhone(sid); if (!phone) { alert('Fornecedor sem WhatsApp.'); return; } const msgId = uid('wa_oc'); const msg = 'Pedido de compra ' + id + '\nFornecedor: ' + supplierName(sid) + '\nTotal: ' + money(o.total || o.totalCompra || 0) + '\nItens:\n' + (o.items || o.itens || []).map(function(i) { return '- ' + (i.qty || i.quantidade || '') + 'x ' + (i.desc || i.descricao || '') + ' ' + money(i.priceUnit || i.precoUnitario || 0); }).join('\n') + '\n\n' + SIGNATURE; db.ref(tpath('whatsappQueue/' + msgId)).set({ id: msgId, tenantId: currentTenantId, supplierId: sid, supplierName: supplierName(sid), phone: phone, to: phone, message: msg, status: 'pending', createdAt: Date.now(), type: 'purchase_order', orderId: id }); }
function renderWhatsapp() { renderLinkedWhatsapp(); renderUnmatched(); }
function renderLinkedWhatsapp() { const rows = []; allQuotes().forEach(function(q) { arr(q.whatsappRawReplies || {}).forEach(function(r) { rows.push({ q: q, r: r }); }); }); $('linkedWhatsappBox').innerHTML = rows.length ? rows.map(function(x) { return '<div class="quote"><b>' + esc(quoteNumber(x.q)) + '</b><br><span class="muted">' + esc(supplierName(x.r.supplierId)) + ' - ' + esc(normalizeDate(x.r.receivedAt)) + '</span><pre>' + esc(x.r.text || '') + '</pre></div>'; }).join('') : '<p class="muted">Sem respostas vinculadas.</p>'; }
function renderUnmatched() { const sups = allSuppliers(); const qs = allQuotes(); const list = arr(unmatched); $('unmatchedWhatsappFull').innerHTML = list.length ? list.map(function(u) { return '<div class="unmatched"><b>' + esc(u.rawId || u.from || u.remetente || '') + '</b><pre>' + esc(u.text || '') + '</pre><div class="grid"><select id="uw_sup_' + esc(u.id) + '"><option value="">Fornecedor</option>' + sups.map(function(s) { return '<option value="' + esc(s.id) + '">' + esc(s.name || s.nome) + '</option>'; }).join('') + '</select><select id="uw_q_' + esc(u.id) + '" onchange="fillItemsForUnmatched(\'' + u.id + '\')"><option value="">Cotação</option>' + qs.map(function(q) { return '<option value="' + esc(q.id) + '">' + esc(quoteNumber(q)) + '</option>'; }).join('') + '</select><select id="uw_item_' + esc(u.id) + '"><option value="">Item</option></select></div><div class="actions"><button class="green" onclick="applyUnmatched(\'' + u.id + '\',true)">Aplicar como resposta</button><button class="amber" onclick="applyUnmatched(\'' + u.id + '\',false)">Aplicar como não tenho</button><button onclick="ignoreUnmatched(\'' + u.id + '\')">Ignorar</button><button class="red" onclick="deleteUnmatched(\'' + u.id + '\')">Excluir da auditoria</button></div></div>'; }).join('') : '<p class="muted">Sem mensagens não vinculadas.</p>'; }
function fillItemsForUnmatched(id) { const q = quotes[$('uw_q_' + id).value] || cotacoes[$('uw_q_' + id).value]; $('uw_item_' + id).innerHTML = '<option value="">Item</option>' + getQuoteItems(q).map(function(i) { return '<option value="' + esc(i.id) + '">' + esc(itemDesc(i)) + '</option>'; }).join(''); }
function applyUnmatched(id, available) { const u = unmatched[id] || {}; const sid = $('uw_sup_' + id).value; const qid = $('uw_q_' + id).value; const iid = $('uw_item_' + id).value; if (!sid || !qid || !iid) { alert('Selecione fornecedor, cotação e item.'); return; } const price = available ? parseMoney(u.text || '') : 0; const updates = {}; updates[tpath('quotes/' + qid + '/responses/' + sid + '/' + iid)] = { available: available, rawText: u.text || '', source: 'whatsapp_manual', updatedAt: Date.now(), price: price, obs: available ? 'aplicado manualmente' : 'não tenho', signature: SIGNATURE }; updates[tpath('audit/unmatchedWhatsapp/' + id)] = null; db.ref().update(updates); }
function ignoreUnmatched(id) { db.ref(tpath('audit/unmatchedWhatsapp/' + id + '/status')).set('ignored'); }
function deleteUnmatched(id) { db.ref(tpath('audit/unmatchedWhatsapp/' + id)).remove(); }
function renderQueue() { $('robotStatusBox').innerHTML = '<p><b>Status:</b> ' + esc(robotStatus.status || 'não informado') + ' <span class="muted">' + esc(normalizeDate(robotStatus.updatedAt)) + '</span></p>'; $('robotQueue').innerHTML = arr(whatsappQueue).slice(-80).reverse().map(function(w) { return '<div class="quote"><b>' + esc(w.status) + '</b> - ' + esc(w.supplierName || w.fornecedorNome) + ' - ' + esc(w.phone || w.to) + '<br><span class="muted">' + esc(w.error || w.quoteId || w.cotacaoId || '') + '</span></div>'; }).join('') || '<p class="muted">Fila vazia.</p>'; }
function renderDebug() { $('debugBox').innerHTML = '<ul><li>tenantId: ' + esc(currentTenantId) + '</li><li>modo legado raiz: ' + (legacyMode ? 'sim' : 'não') + '</li><li>Firebase conectado: ' + (!!db) + '</li><li>Usuário: ' + esc(currentUser && currentUser.email || '') + '</li><li>Nicho: ' + esc(currentTenant.niche || settings.niche || '') + '</li><li>suppliers: ' + Object.keys(suppliers).length + '</li><li>fornecedores legado: ' + Object.keys(fornecedores).length + '</li><li>priceDb: ' + Object.keys(priceDb).length + '</li><li>quotes: ' + Object.keys(quotes).length + '</li><li>cotacoes legado: ' + Object.keys(cotacoes).length + '</li><li>whatsappQueue: ' + Object.keys(whatsappQueue).length + '</li><li>audit/unmatchedWhatsapp: ' + Object.keys(unmatched).length + '</li></ul>'; }
function searchVehicleHistory() { const placa = ($('vehPlate') && $('vehPlate').value || '').toLowerCase(); const chassi = ($('vehChassi') && $('vehChassi').value || '').toLowerCase(); const cliente = ($('vehCustomer') && $('vehCustomer').value || '').toLowerCase(); const prefixo = ($('vehPrefix') && $('vehPrefix').value || '').toLowerCase(); if (!placa && !chassi && !cliente && !prefixo) { $('vehicleHistoryBox').innerHTML = ''; return; } const qlist = allQuotes().filter(function(q) { const v = quoteVehicle(q); return (placa && String(v.plate || v.placa || '').toLowerCase().indexOf(placa) >= 0) || (chassi && String(v.chassi || '').toLowerCase().indexOf(chassi) >= 0) || (cliente && String(v.customer || v.cliente || '').toLowerCase().indexOf(cliente) >= 0) || (prefixo && String(v.prefix || v.prefixo || '').toLowerCase().indexOf(prefixo) >= 0); }); const plist = arr(priceDb).filter(function(p) { return (placa && String(p.plate || '').toLowerCase().indexOf(placa) >= 0) || (chassi && String(p.chassi || '').toLowerCase().indexOf(chassi) >= 0); }).slice(-8); $('vehicleHistoryBox').innerHTML = (qlist.length || plist.length) ? '<div class="card"><h3>Histórico encontrado</h3><p class="muted">Veículo encontrado, últimas cotações, peças já orçadas, últimos preços, fornecedores usados e OCs relacionadas.</p>' + qlist.slice(0,8).map(function(q) { return '<div class="quote"><b>' + esc(quoteNumber(q)) + '</b><br>' + getQuoteItems(q).map(function(i) { return esc(itemDesc(i)); }).join('<br>') + '</div>'; }).join('') + plist.map(function(p) { return '<div class="quote"><b>' + esc(p.desc) + '</b><br>' + esc(p.oem) + ' - ' + money(p.price) + ' - ' + esc(supplierName(p.supplierId)) + '</div>'; }).join('') + '</div>' : ''; }
function downloadText(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
