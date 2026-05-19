let db = null;
let adminUser = null;
let tenants = {};
let globalDb = {};
let tenantStats = {};
let generatedFirebase = '';
let generatedRobot = '';
let generatedNotes = '';
const SIGNATURE = 'Powered by thIAguinho Soluções Digitais';
const NICHOS = [
  { id: 'oficina', icon: 'OF', name: 'Autopeças / Oficina / Frota', desc: 'Peças, veículos, frotas, OS e ordens de compra.', fields: ['placa','chassi','marca','modelo','ano','km','prefixo'], categories: ['motor','freio','suspensão','elétrica','lataria','pneu'], message: 'Confirme disponibilidade, marca, código da marca, preço e prazo.', mainItem: 'veículo', db: 'priceDb_oficina' },
  { id: 'construcao', icon: 'MC', name: 'Materiais de construção', desc: 'Obras, centros de custo, materiais e entregas.', fields: ['obra','etapa','endereço','prazo'], categories: ['cimento','areia','hidráulica','elétrica','acabamento'], message: 'Informe marca, unidade, preço e prazo de entrega.', mainItem: 'obra', db: 'priceDb_construcao' },
  { id: 'farmacia', icon: 'FD', name: 'Farmácia / Drogaria', desc: 'Medicamentos, perfumaria e itens regulados.', fields: ['princípio ativo','apresentação','lote','validade'], categories: ['medicamento','genérico','similar','perfumaria'], message: 'Informe laboratório, apresentação, validade, preço e disponibilidade.', mainItem: 'produto', db: 'priceDb_farmacia' },
  { id: 'agro_pet', icon: 'AP', name: 'Agropecuária / Pet shop', desc: 'Rações, vacinas, medicamentos e insumos.', fields: ['espécie','peso','marca','embalagem'], categories: ['ração','medicamento','higiene','acessórios'], message: 'Informe marca, embalagem, preço e disponibilidade.', mainItem: 'animal/produto', db: 'priceDb_agro_pet' },
  { id: 'informatica', icon: 'TI', name: 'Informática / Eletrônicos', desc: 'Hardware, periféricos, redes e manutenção.', fields: ['modelo','part number','garantia','voltagem'], categories: ['hardware','rede','periférico','software'], message: 'Informe modelo exato, garantia, preço e prazo.', mainItem: 'equipamento', db: 'priceDb_informatica' },
  { id: 'mercado', icon: 'MM', name: 'Mercado / Mercearia', desc: 'Produtos de giro, compras recorrentes e atacado.', fields: ['ean','marca','embalagem','validade'], categories: ['alimentos','bebidas','limpeza','higiene'], message: 'Informe embalagem, marca, preço e condição comercial.', mainItem: 'produto', db: 'priceDb_mercado' },
  { id: 'papelaria', icon: 'PE', name: 'Papelaria / Escritório', desc: 'Materiais de escritório, escolar e suprimentos.', fields: ['marca','unidade','cor','gramatura'], categories: ['papel','caneta','toner','arquivo'], message: 'Informe marca, unidade, preço e prazo.', mainItem: 'produto', db: 'priceDb_papelaria' },
  { id: 'restaurante', icon: 'FS', name: 'Restaurante / Food service', desc: 'Insumos, bebidas, descartáveis e limpeza.', fields: ['embalagem','validade','temperatura','marca'], categories: ['proteína','hortifruti','bebida','descartável'], message: 'Informe embalagem, validade, preço e janela de entrega.', mainItem: 'insumo', db: 'priceDb_restaurante' },
  { id: 'hotel', icon: 'HP', name: 'Hotel / Pousada', desc: 'Enxoval, amenities, manutenção e compras recorrentes.', fields: ['setor','quarto','marca','medida'], categories: ['enxoval','amenities','manutenção','limpeza'], message: 'Informe especificação, preço e prazo.', mainItem: 'setor/quarto', db: 'priceDb_hotel' },
  { id: 'estetica', icon: 'ES', name: 'Estética / Salão / Barbearia', desc: 'Cosméticos, equipamentos e descartáveis.', fields: ['marca','linha','volume','validade'], categories: ['cosmético','descartável','equipamento','higiene'], message: 'Informe marca, linha, preço e disponibilidade.', mainItem: 'produto', db: 'priceDb_estetica' },
  { id: 'marcenaria', icon: 'MA', name: 'Marcenaria / Móveis', desc: 'Chapas, ferragens, acabamento e projetos.', fields: ['projeto','medida','cor','acabamento'], categories: ['mdf','ferragem','cola','acabamento'], message: 'Informe medida, cor, marca, preço e prazo.', mainItem: 'projeto', db: 'priceDb_marcenaria' },
  { id: 'ferragens', icon: 'FM', name: 'Ferragens / Metalúrgica', desc: 'Perfis, chapas, ferramentas e serviços.', fields: ['medida','material','bitola','norma'], categories: ['aço','ferramenta','fixador','serviço'], message: 'Informe material, medida, preço e prazo.', mainItem: 'peça/projeto', db: 'priceDb_ferragens' },
  { id: 'eletrica', icon: 'EL', name: 'Elétrica / Iluminação', desc: 'Cabos, disjuntores, luminárias e componentes.', fields: ['voltagem','amperagem','norma','marca'], categories: ['cabo','disjuntor','luminária','tomada'], message: 'Informe marca, norma, preço e disponibilidade.', mainItem: 'instalação', db: 'priceDb_eletrica' },
  { id: 'hidraulica', icon: 'HD', name: 'Hidráulica / Piscina', desc: 'Tubos, conexões, bombas, filtros e químicos.', fields: ['medida','pressão','material','aplicação'], categories: ['tubo','conexão','bomba','químico'], message: 'Informe medida, material, preço e prazo.', mainItem: 'sistema', db: 'priceDb_hidraulica' },
  { id: 'limpeza', icon: 'LH', name: 'Limpeza / Higiene', desc: 'Produtos profissionais, descartáveis e EPI.', fields: ['embalagem','concentração','rendimento','marca'], categories: ['químico','papel','descartável','equipamento'], message: 'Informe embalagem, rendimento, preço e prazo.', mainItem: 'produto', db: 'priceDb_limpeza' },
  { id: 'uniformes_epi', icon: 'UE', name: 'Uniformes / EPI', desc: 'Uniformes, calçados, proteção e personalização.', fields: ['tamanho','cor','CA','personalização'], categories: ['uniforme','calçado','proteção','acessório'], message: 'Informe tamanho, CA quando houver, preço e prazo.', mainItem: 'colaborador/item', db: 'priceDb_uniformes_epi' },
  { id: 'eventos', icon: 'EV', name: 'Eventos / Festas', desc: 'Locação, decoração, buffet e produção.', fields: ['data','local','quantidade','duração'], categories: ['buffet','decoração','locação','som/luz'], message: 'Informe disponibilidade para data, escopo, preço e condições.', mainItem: 'evento', db: 'priceDb_eventos' },
  { id: 'clinicas_odonto', icon: 'CO', name: 'Clínicas / Odonto', desc: 'Materiais clínicos, descartáveis e equipamentos.', fields: ['registro','lote','validade','marca'], categories: ['odontológico','hospitalar','descartável','equipamento'], message: 'Informe registro, validade, marca, preço e prazo.', mainItem: 'produto', db: 'priceDb_clinicas_odonto' },
  { id: 'transportes', icon: 'TL', name: 'Transportes / Logística', desc: 'Manutenção, pneus, frete, embalagens e insumos.', fields: ['rota','placa','km','tipo carga'], categories: ['frete','pneu','manutenção','embalagem'], message: 'Informe escopo, preço, prazo e condições.', mainItem: 'veículo/rota', db: 'priceDb_transportes' },
  { id: 'generico', icon: 'GP', name: 'Cotação genérica de produtos', desc: 'Produtos ou serviços sem nicho específico.', fields: ['código','descrição','unidade','quantidade'], categories: ['produto','serviço','insumo','manutenção'], message: 'Informe disponibilidade, especificação, preço e prazo.', mainItem: 'item', db: 'priceDb_generico' }
];
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]; }); }
function safeEmail(e) { return String(e || '').toLowerCase().replace(/[.#$\[\]]/g, '_'); }
function slug(v) { return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function showTab(id) { document.querySelectorAll('.tab').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === id); }); document.querySelectorAll('.tabpage').forEach(function(p) { p.classList.toggle('hidden', p.id !== id); }); }
document.querySelectorAll('.tab').forEach(function(b) { b.onclick = function() { showTab(b.dataset.tab); }; });
window.addEventListener('load', function() {
  firebase.initializeApp(window.firebaseConfig);
  db = firebase.database();
  $('tenantNiche').innerHTML = NICHOS.map(function(n) { return '<option value="' + n.id + '">' + n.icon + ' ' + n.name + '</option>'; }).join('');
  $('globalFilter').innerHTML = '<option value="">Todos</option>' + NICHOS.map(function(n) { return '<option value="' + n.id + '">' + n.name + '</option>'; }).join('');
  $('nicheList').innerHTML = NICHOS.map(function(n) { return '<div class="quote"><h3>' + n.icon + ' ' + esc(n.name) + '</h3><p>' + esc(n.desc) + '</p><p><b>id:</b> ' + esc(n.id) + '</p><p><b>Campos:</b> ' + esc(n.fields.join(', ')) + '</p><p><b>Categorias:</b> ' + esc(n.categories.join(', ')) + '</p><p><b>Item principal:</b> ' + esc(n.mainItem) + '</p><p><b>Banco lógico:</b> ' + esc(n.db) + '</p></div>'; }).join('');
  firebase.auth().onAuthStateChanged(async function(u) { adminUser = u; $('loginOverlay').classList.toggle('authHidden', !!u); if (u) await bootAdmin(u.email); });
});
async function loginAdmin() { try { await firebase.auth().signInWithEmailAndPassword($('adminEmail').value.trim().toLowerCase(), $('adminPass').value); } catch (e) { $('loginError').textContent = e.message; } }
async function bootAdmin(email) {
  const snap = await db.ref('adminEmails/' + safeEmail(email)).once('value');
  if (!snap.exists() || snap.val().active === false) { alert('E-mail não liberado como admin em adminEmails.'); firebase.auth().signOut(); return; }
  db.ref('tenants').on('value', function(s) { tenants = s.val() || {}; renderTenants(); renderDiag(); });
  db.ref('globalPriceDb').on('value', function(s) { globalDb = s.val() || {}; renderGlobal(); renderDiag(); });
  watchTenantStats();
}
function watchTenantStats() { ['tenants','tenantEmailIndex','publicQuotes','globalPriceDb','whatsappContacts'].forEach(function(k) { db.ref(k).on('value', function(s) { tenantStats[k] = s.numChildren ? s.numChildren() : Object.keys(s.val() || {}).length; renderDiag(); }); }); }
function clearTenantForm() { ['tenantName','tenantId','tenantEmail','tenantManager','tenantCity','tenantResponsible','tenantObs'].forEach(function(i) { $(i).value = ''; }); $('tenantStatus').value = 'implantacao'; $('globalAccess').value = 'false'; $('globalPublish').value = 'false'; }
function tenantPayload(id, email) { return { tenantId: id, businessName: $('tenantName').value.trim(), email: email, niche: $('tenantNiche').value, managerPhone: $('tenantManager').value.trim(), city: $('tenantCity').value.trim(), responsible: $('tenantResponsible').value.trim(), implementationStatus: $('tenantStatus').value, globalPriceAccess: $('globalAccess').value === 'true', globalPricePublish: $('globalPublish').value === 'true', obs: $('tenantObs').value, active: true, updatedAt: Date.now(), createdBy: adminUser.email, signature: SIGNATURE }; }
function normalizedTenantKey(t, key) { return [safeEmail(t.email || ''), slug(t.tenantId || key || ''), slug(t.businessName || '')].filter(Boolean).join('|'); }
function tenantListWithDuplicates() {
  const raw = Object.entries(tenants || {}).map(function(e) { return Object.assign({ key: e[0] }, (e[1] || {}).meta || {}); });
  const groups = [];
  raw.forEach(function(t) {
    const emailKey = safeEmail(t.email || '');
    const idKey = slug(t.tenantId || t.key || '');
    const nameKey = slug(t.businessName || '');
    let group = groups.find(function(g) {
      return (emailKey && g.emails[emailKey]) || (idKey && g.ids[idKey]) || (nameKey && g.names[nameKey]);
    });
    if (!group) { group = { rows: [], emails: {}, ids: {}, names: {} }; groups.push(group); }
    group.rows.push(t);
    if (emailKey) group.emails[emailKey] = true;
    if (idKey) group.ids[idKey] = true;
    if (nameKey) group.names[nameKey] = true;
  });
  return groups.map(function(g) {
    const group = g.rows;
    group.sort(function(a,b) { return (a.key === slug(a.key) ? -1 : 1) - (b.key === slug(b.key) ? -1 : 1); });
    const primary = group.find(function(t) { return t.active !== false; }) || group[0];
    primary.duplicates = group.filter(function(t) { return t.key !== primary.key; });
    return primary;
  });
}
async function saveTenant() {
  const email = $('tenantEmail').value.trim().toLowerCase();
  if (!email) { alert('E-mail obrigatório.'); return; }
  const id = slug($('tenantId').value.trim() || $('tenantName').value.trim() || email.split('@')[0]);
  if (!id) { alert('Tenant ID inválido.'); return; }
  const nameKey = slug($('tenantName').value.trim());
  const emailKey = safeEmail(email);
  let duplicates = Object.entries(tenants || {}).filter(function(e) {
    const key = e[0];
    const t = ((e[1] || {}).meta || {});
    return key !== id && (safeEmail(t.email || '') === emailKey || slug(t.tenantId || key) === id || (nameKey && slug(t.businessName || '') === nameKey));
  });
  const indexed = await db.ref('tenantEmailIndex/' + emailKey).once('value');
  if (indexed.exists() && indexed.val().tenantId && indexed.val().tenantId !== id && !duplicates.find(function(e) { return e[0] === indexed.val().tenantId; })) {
    duplicates.push([indexed.val().tenantId, tenants[indexed.val().tenantId] || { meta: { tenantId: indexed.val().tenantId, email: email } }]);
  }
  if (duplicates.length) {
    const target = duplicates[0][0];
    if (!confirm('Este estabelecimento já existe no superadmin (' + target + '). Vou atualizar o cadastro canônico e desativar o duplicado, sem apagar dados. Continuar?')) return;
  }
  const meta = tenantPayload(id, email);
  const up = {};
  up['tenants/' + id + '/meta'] = meta;
  up['tenantEmailIndex/' + emailKey] = { tenantId: id, email: email, role: 'tenant_client', active: true, updatedAt: Date.now() };
  duplicates.forEach(function(e) {
    up['tenants/' + e[0] + '/meta/active'] = false;
    up['tenants/' + e[0] + '/meta/duplicateOf'] = id;
    up['tenants/' + e[0] + '/meta/duplicateMarkedAt'] = Date.now();
  });
  db.ref().update(up).then(function() { alert('Estabelecimento salvo sem duplicar. O cliente entra no index.html e cria a própria senha.'); clearTenantForm(); });
}
function renderTenants() { const list = tenantListWithDuplicates(); $('fileTenant').innerHTML = '<option value="">Selecione</option>' + list.map(function(t) { return '<option value="' + esc(t.tenantId || t.key) + '">' + esc(t.businessName || t.tenantId || t.key) + '</option>'; }).join(''); $('tenantList').innerHTML = list.length ? '<div class="tablewrap"><table><tr><th>Estabelecimento</th><th>E-mail</th><th>Nicho</th><th>Status</th><th>Global</th><th>Ações</th></tr>' + list.map(function(t) { const id = t.tenantId || t.key; const dup = (t.duplicates || []).length ? '<br><span class="bad">Duplicado(s): ' + esc(t.duplicates.map(function(d) { return d.key; }).join(', ')) + '</span> <button class="amber" onclick="deactivateDuplicateTenants(\'' + id + '\')">Desativar duplicados</button>' : ''; return '<tr><td>' + esc(t.businessName) + '<br><span class="muted">' + esc(id) + '</span>' + dup + '</td><td>' + esc(t.email) + '</td><td>' + esc(t.niche) + '</td><td>' + esc(t.implementationStatus || (t.active === false ? 'inativo' : 'ativo')) + '</td><td>' + (t.globalPriceAccess ? 'consulta ' : '') + (t.globalPricePublish ? 'publica' : '') + '</td><td><button onclick="editTenant(\'' + id + '\')">Editar</button> <button class="amber" onclick="setTenantActive(\'' + id + '\',false)">Desativar</button> <button class="green" onclick="setTenantActive(\'' + id + '\',true)">Reativar</button> <button class="red" onclick="deleteTenant(\'' + id + '\')">Excluir</button></td></tr>'; }).join('') + '</table></div>' : '<p class="muted">Nenhum estabelecimento cadastrado.</p>'; }
function deactivateDuplicateTenants(id) { const primary = tenantListWithDuplicates().find(function(t) { return (t.tenantId || t.key) === id; }); if (!primary || !primary.duplicates || !primary.duplicates.length) return; if (!confirm('Desativar registros duplicados deste estabelecimento sem apagar dados?')) return; const updates = {}; primary.duplicates.forEach(function(d) { updates['tenants/' + d.key + '/meta/active'] = false; updates['tenants/' + d.key + '/meta/duplicateOf'] = id; updates['tenants/' + d.key + '/meta/duplicateMarkedAt'] = Date.now(); }); if (primary.email) updates['tenantEmailIndex/' + safeEmail(primary.email)] = { tenantId: id, email: primary.email, role: 'tenant_client', active: true, updatedAt: Date.now() }; db.ref().update(updates); }
function editTenant(id) { const t = (tenants[id] || {}).meta || {}; $('tenantId').value = t.tenantId || id; $('tenantName').value = t.businessName || ''; $('tenantEmail').value = t.email || ''; $('tenantNiche').value = t.niche || 'oficina'; $('tenantManager').value = t.managerPhone || ''; $('tenantCity').value = t.city || ''; $('tenantResponsible').value = t.responsible || ''; $('tenantStatus').value = t.implementationStatus || 'ativo'; $('globalAccess').value = String(!!t.globalPriceAccess); $('globalPublish').value = String(!!t.globalPricePublish); $('tenantObs').value = t.obs || ''; showTab('clientes'); }
function setTenantActive(id, active) { const updates = {}; updates['tenants/' + id + '/meta/active'] = active; const email = ((tenants[id] || {}).meta || {}).email; if (email) updates['tenantEmailIndex/' + safeEmail(email) + '/active'] = active; db.ref().update(updates); }
function deleteTenant(id) {
  const t = (tenants[id] || {}).meta || {};
  if (!confirm('Excluir este estabelecimento do superadmin e remover o acesso dele? Esta ação apaga tenants/' + id + '.')) return;
  const updates = {};
  updates['tenants/' + id] = null;
  updates['publicQuotes/' + id] = null;
  if (t.email) updates['tenantEmailIndex/' + safeEmail(t.email)] = null;
  db.ref().update(updates).then(function() { alert('Estabelecimento excluído.'); });
}
function renderGlobal() { const filter = $('globalFilter') && $('globalFilter').value || ''; let html = ''; Object.entries(globalDb || {}).forEach(function(entry) { const niche = entry[0], items = entry[1] || {}; if (filter && niche !== filter) return; html += '<h3>' + esc(niche) + '</h3>'; html += Object.values(items).slice(-50).map(function(p) { return '<div class="quote"><b>' + esc(p.desc || p.descricao || '') + '</b><br>' + esc(p.oem || '') + ' ' + esc(p.brand || '') + ' - ' + Number(p.price || p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '<br><span class="muted">origem anonimizada</span></div>'; }).join(''); }); $('globalList').innerHTML = html || '<p class="muted">Sem dados globais.</p>'; }
function parseConfig(t) { t = String(t || '').trim().replace(/^const\s+firebaseConfig\s*=\s*/, '').replace(/;\s*$/, ''); return Function('return (' + t + ')')(); }
function fillFromBlock() { try { const c = parseConfig($('cfg').value); ['apiKey','authDomain','databaseURL','projectId','storageBucket','messagingSenderId','appId'].forEach(function(k) { $(k).value = c[k] || ''; }); } catch(e) { alert('Não consegui ler o bloco Firebase.'); } }
function fileTenantContext() {
  const tenantId = $('fileTenant').value || $('tenantId').value.trim();
  const fallbackEmail = $('tenantEmail').value.trim().toLowerCase();
  const t = (tenants[tenantId] || {}).meta || tenantPayload(tenantId || 'tenant', fallbackEmail);
  const id = t.tenantId || tenantId || slug(t.businessName || fallbackEmail || 'tenant');
  return { tenantId: id, tenant: t };
}
function currentFirebaseConfigFiles() {
  return {
    apiKey: $('apiKey').value.trim(),
    authDomain: $('authDomain').value.trim(),
    databaseURL: $('databaseURL').value.trim(),
    projectId: $('projectId').value.trim(),
    storageBucket: $('storageBucket').value.trim(),
    messagingSenderId: $('messagingSenderId').value.trim(),
    appId: $('appId').value.trim()
  };
}
function buildFileArtifacts() {
  const ctx = fileTenantContext();
  const t = ctx.tenant;
  const tenantId = ctx.tenantId;
  const siteUrl = $('siteUrl').value.trim();
  const c = currentFirebaseConfigFiles();
  generatedFirebase = 'const firebaseConfig = ' + JSON.stringify(c, null, 2) + ';\nif (typeof window !== "undefined") window.firebaseConfig = firebaseConfig;\nif (typeof module !== "undefined") module.exports = firebaseConfig;\n';
  generatedRobot = JSON.stringify({
    tenantId: tenantId,
    legacyMode: false,
    watchAllTenants: false,
    siteUrl: siteUrl,
    managerPhone: t.managerPhone || '',
    dailyLimit: 100,
    sendIntervalMs: 9000,
    signature: SIGNATURE
  }, null, 2);
  generatedNotes = 'DADOS DO CLIENTE - valor_IA\n\n' +
    'Estabelecimento: ' + (t.businessName || '') + '\n' +
    'Tenant ID: ' + tenantId + '\n' +
    'E-mail autorizado: ' + (t.email || '') + '\n' +
    'Nicho: ' + (t.niche || '') + '\n' +
    'WhatsApp gestor: ' + (t.managerPhone || '') + '\n' +
    'GitHub Pages: ' + siteUrl + '\n' +
    'Firebase projectId: ' + c.projectId + '\n' +
    'Database URL: ' + c.databaseURL + '\n\n' +
    'INSTALACAO DO ROBO NO PC DO CLIENTE\n' +
    '1. Extraia o ZIP na Area de Trabalho.\n' +
    '2. Abra a pasta gerada e execute INSTALAR_E_ABRIR_ROBO_VALORIA.bat.\n' +
    '3. Leia o QR Code no WhatsApp quando o painel abrir.\n' +
    '4. Para iniciar com Windows, execute INSTALAR_ROBO_INICIAR_COM_WINDOWS.bat.\n' +
    '5. Para trocar o WhatsApp, execute RESETAR_QR_CODE_ROBO.bat.\n\n' +
    'O robo deste pacote trabalha em tenants/' + tenantId + '/whatsappQueue.\n';
  return { tenantId, tenant: t, firebaseConfig: c, siteUrl };
}
function generateFiles() {
  buildFileArtifacts();
  $('filePreview').textContent = generatedFirebase + '\n' + generatedRobot + '\n' + generatedNotes;
}
function downloadFile(name, text) { if (!text) { alert('Gere primeiro.'); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
function safeFolderName(v) {
  return String(v || 'Cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Cliente';
}
function safeZipName(v) {
  return safeFolderName(v).replace(/\s+/g, '_');
}
const ROBO_TEMPLATE_FILES = [
  'ABRIR_PAINEL_ROBO.bat',
  'INSTALAR_E_ABRIR_ROBO_VALORIA.bat',
  'INSTALAR_ROBO_INICIAR_COM_WINDOWS.bat',
  'REMOVER_ROBO_DA_INICIALIZACAO.bat',
  'RESETAR_QR_CODE_ROBO.bat',
  'README_PC_CLIENTE.txt',
  'robo-whatsapp/package.json',
  'robo-whatsapp/package-lock.json',
  'robo-whatsapp/server.js'
];
async function fetchRoboTemplateFile(rel) {
  const resp = await fetch('assets/robo-template/' + rel + '?v=' + Date.now(), { cache: 'no-store' });
  if (!resp.ok) throw new Error('Template do robo nao encontrado: ' + rel);
  return resp.text();
}
function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
}
async function downloadRoboPackage() {
  try {
    if (typeof JSZip === 'undefined') { alert('Biblioteca local JSZip nao carregou. Verifique assets/vendor/jszip.min.js.'); return; }
    const ctx = buildFileArtifacts();
    if (!ctx.tenantId) { alert('Selecione ou preencha o tenant antes de gerar o pacote.'); return; }
    if (!ctx.firebaseConfig.databaseURL || !ctx.firebaseConfig.projectId) { alert('Preencha o Firebase config do Prec_IA antes de gerar o pacote.'); return; }
    const folderName = 'thIAguinho Cotacao - ' + safeFolderName(ctx.tenant.businessName || ctx.tenantId);
    const zip = new JSZip();
    const root = zip.folder(folderName);
    const texts = await Promise.all(ROBO_TEMPLATE_FILES.map(function(rel) { return fetchRoboTemplateFile(rel).then(function(text) { return { rel, text }; }); }));
    texts.forEach(function(item) { root.file(item.rel, item.text); });
    root.file('firebase-config.js', generatedFirebase);
    root.file('robo-config.json', generatedRobot);
    root.file('DADOS_DO_CLIENTE.txt', generatedNotes);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    downloadBlob(safeZipName(folderName) + '.zip', blob);
    $('filePreview').textContent = generatedFirebase + '\n' + generatedRobot + '\n' + generatedNotes + '\n\nPACOTE COMPLETO GERADO: ' + folderName + '.zip';
  } catch (e) {
    console.error(e);
    alert('Erro ao gerar pacote completo do robo: ' + (e.message || e));
  }
}
function renderDiag() { const statsHtml = Object.entries(tenantStats).map(function(e) { return '<li>' + esc(e[0]) + ': ' + esc(e[1]) + '</li>'; }).join(''); $('diagBox').innerHTML = '<ul><li>Admin: ' + esc(adminUser && adminUser.email || '') + '</li><li>Tenants cadastrados: ' + Object.keys(tenants || {}).length + '</li><li>Nichos globais: ' + Object.keys(globalDb || {}).length + '</li><li>Nichos disponiveis: ' + NICHOS.length + '</li></ul><h3>Estrutura multi-tenant Prec_IA</h3><p class="muted">Cotacoes, fornecedores, veiculos, fila do robo e respostas ficam sempre em tenants/{tenantId}. Links publicos usam publicQuotes/{tenantId}/{quoteId}.</p><ul>' + (statsHtml || '<li>Sem dados carregados.</li>') + '</ul>'; }
