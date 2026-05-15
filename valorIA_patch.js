
(function(){
  const STYLE_ID = "valorIA_final_visual_patch";
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent = `
button.light{background:#dbeafe!important;color:#0f172a!important;border:1px solid #3b82f6!important}
button.light:hover{background:#bfdbfe!important}
.tab{background:#dbeafe!important;color:#0f172a!important;border:1px solid #60a5fa!important}
.tab.active{background:#1d4ed8!important;color:#fff!important;border-color:#1d4ed8!important}
.checkboxCard{background:#fff!important;color:#0f172a!important;border:1px solid #64748b!important}
.fixPanel{border:1px solid var(--line);border-radius:16px;background:var(--card);padding:14px;margin-top:12px}
.fixPiece{border:1px solid var(--line);border-radius:14px;background:rgba(148,163,184,.08);padding:12px;margin:10px 0}
.unmatched{border:1px solid #f59e0b;border-radius:14px;background:#fffbeb;color:#78350f;padding:12px;margin:10px 0}
body.theme-dark button.light{background:#334155!important;color:#f8fafc!important;border-color:#94a3b8!important}
body.theme-dark .checkboxCard{background:#1e293b!important;color:#f8fafc!important;border-color:#94a3b8!important}
`;
    document.head.appendChild(style);
  }

  window.uiState = window.uiState || {openPanels:{}, selectedSuppliers:{}};
  window.auditUnmatched = window.auditUnmatched || {};
  window.editingSupplier = null;

  function E(v){
    if(typeof esc === "function") return esc(v);
    return String(v==null?"":v).replace(/[&<>"']/g, function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m];});
  }
  function M(v){
    if(typeof money === "function") return money(v);
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }
  function K(source,id){return source+"__"+id;}
  function getQ(source,id){return typeof getQuote==="function" ? getQuote(source,id) : null;}
  function best(q,it){return typeof bestForItem==="function" ? bestForItem(q,it) : null;}
  function rows(q,it){return typeof responsesForItem==="function" ? responsesForItem(q,it) : [];}
  function allSups(){
    var list=[];
    try{
      Object.entries(window.suppliers||suppliers||{}).forEach(function(p){
        var s=p[1]||{};
        list.push({root:"suppliers",id:p[0],name:s.name||s.nome||p[0],phone:s.phone||s.whatsapp||"",types:s.types||s.tipos||[],obs:s.obs||"",active:s.active!==false});
      });
    }catch(e){}
    try{
      Object.entries(window.fornecedores||fornecedores||{}).forEach(function(p){
        var s=p[1]||{};
        list.push({root:"fornecedores",id:p[0],name:s.nome||s.name||p[0],phone:s.whatsapp||s.phone||"",types:s.tipos||s.types||[],obs:s.obs||"",active:s.ativo!==false});
      });
    }catch(e){}
    var seen={};
    return list.filter(function(s){var k=s.root+":"+s.id;if(seen[k])return false;seen[k]=true;return true;});
  }
  function wrap(html){return '<div class="fixPanel">'+html+'<p class="muted small">Powered by thIAguinho Soluções Digitais</p></div>';}

  function comparison(q){
    var html='<h3>📊 Comparação organizada</h3><p class="muted">Todas as respostas separadas por peça, fornecedor, marca, código, preço, prazo e observação.</p>';
    (q.items||[]).forEach(function(it){
      var qty=Number(it.qty||1);
      var rs=rows(q,it);
      html+='<div class="fixPiece"><h3>'+E(it.seq||"")+'. '+E(it.desc||"-")+'</h3><span class="pill">Código: '+E(it.oem||"-")+'</span><span class="pill">Qtd: '+qty+'</span><span class="pill">Venda/base: '+M(it.saleTotal||0)+'</span>';
      if(!rs.length){
        html+='<p class="bad">Sem resposta para esta peça.</p>';
      }else{
        html+='<div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Fornecedor</th><th>Status</th><th>Marca</th><th>Cód. marca</th><th>Descrição</th><th>Unit.</th><th>Total</th><th>Prazo</th><th>Obs./bruto</th></tr></thead><tbody>';
        rs.forEach(function(r){
          var price=Number(r.price||r.precoUnitario||0);
          var disponivel=(r.available!==false && r.temDisponivel!==false);
          html+='<tr><td><b>'+E(r.supplierName||r.fornecedorNome||"-")+'</b><br><span class="muted">'+E(r.source||r.origem||"")+'</span></td><td>'+(disponivel?'<span class="ok">Tem</span>':'<span class="bad">Não tem</span>')+'</td><td>'+E(r.brand||r.marca||"-")+'</td><td>'+E(r.brandCode||r.codigoMarca||"-")+'</td><td>'+E(r.desc||r.descricaoFornecedor||"-")+'</td><td>'+(price>0?M(price):"-")+'</td><td>'+(price>0?M(price*qty):"-")+'</td><td>'+E(r.availability||r.disponibilidade||"-")+'</td><td>'+E(r.obs||r.observacao||"-")+(r.raw?'<br><span class="muted">Bruto: '+E(r.raw)+'</span>':'')+'</td></tr>';
        });
        html+='</tbody></table></div>';
      }
      html+='</div>';
    });
    return wrap(html);
  }
  function items(q){
    var html='<h3>📦 Peças</h3><div class="tablewrap"><table><thead><tr><th>#</th><th>Código</th><th>Descrição</th><th>Qtd</th><th>Venda/base</th><th>Tipo</th></tr></thead><tbody>';
    (q.items||[]).forEach(function(it){
      html+='<tr><td>'+E(it.seq||"")+'</td><td>'+E(it.oem||"-")+'</td><td><b>'+E(it.desc||"-")+'</b></td><td>'+E(it.qty||1)+'</td><td>'+M(it.saleTotal||0)+'</td><td>'+E(it.type||"geral")+'</td></tr>';
    });
    return wrap(html+'</tbody></table></div>');
  }
  function raw(q){
    var raws=Object.entries(q.rawReplies||{}).sort(function(a,b){return (b[1].receivedAt||0)-(a[1].receivedAt||0);});
    var html='<h3>💬 Respostas diretas no WhatsApp</h3>';
    if(!raws.length) html+='<p class="muted">Nenhuma resposta direta registrada nesta cotação.</p>';
    raws.forEach(function(p){
      var r=p[1]||{};
      html+='<div class="quote"><b>'+E(r.supplierName||r.supplierId||"Fornecedor")+'</b><br><span class="muted">'+(r.receivedAt?new Date(r.receivedAt).toLocaleString("pt-BR"):"")+' — '+E(r.parseStatus||"")+'</span><pre>'+E(r.text||"")+'</pre></div>';
    });
    return wrap(html);
  }
  function selectedMap(source,id){
    var key=K(source,id);
    if(!window.uiState.selectedSuppliers[key]) window.uiState.selectedSuppliers[key]={};
    return window.uiState.selectedSuppliers[key];
  }
  window.toggleSendSupplier=function(source,id,key,checked){selectedMap(source,id)[key]=!!checked;};
  window.selectAllSend=function(source,id){var m=selectedMap(source,id);allSups().forEach(function(s){m[s.root+":"+s.id]=true;});setOpenPanel(source,id,"send");};
  window.clearSend=function(source,id){window.uiState.selectedSuppliers[K(source,id)]={};setOpenPanel(source,id,"send");};
  function send(q){
    var m=selectedMap(q.source,q.id);
    var count=Object.values(m).filter(Boolean).length;
    var html='<h3>📨 Enviar convites aos fornecedores</h3><p class="muted">A seleção fica estável e esta área não fecha quando o Firebase atualiza.</p>';
    html+='<div class="row"><button class="light" onclick="selectAllSend(\''+q.source+'\',\''+q.id+'\')">Selecionar todos</button><button class="light" onclick="clearSend(\''+q.source+'\',\''+q.id+'\')">Limpar seleção</button><button onclick="enqueueSelectedStable(\''+q.source+'\',\''+q.id+'\')">Enviar selecionados com robô ('+count+')</button></div><div class="grid" style="margin-top:10px">';
    allSups().forEach(function(s){
      var key=s.root+":"+s.id;
      html+='<label class="checkboxCard"><input type="checkbox" '+(m[key]?'checked':'')+' onchange="toggleSendSupplier(\''+q.source+'\',\''+q.id+'\',\''+key+'\',this.checked)"> <b>'+E(s.name)+'</b><br><span class="muted">'+E(s.phone)+'</span></label>';
    });
    return wrap(html+'</div>');
  }
  window.enqueueSelectedStable=function(source,id){
    var q=getQ(source,id);
    if(!q)return alert("Cotação não encontrada.");
    var m=selectedMap(source,id);
    var all={};allSups().forEach(function(s){all[s.root+":"+s.id]=s;});
    var chosen=Object.keys(m).filter(function(k){return m[k];}).map(function(k){return all[k];}).filter(Boolean);
    if(!chosen.length)return alert("Selecione fornecedores.");
    var updates={};
    chosen.forEach(function(s){
      var key=(typeof uid==="function")?uid("wa"):"wa_"+Date.now()+"_"+Math.random().toString(16).slice(2);
      var msg=(typeof buildMessage==="function")?buildMessage(q,s.id,{name:s.name,phone:s.phone}):("Cotação "+(q.number||q.id));
      var phone=(typeof phoneBR==="function")?phoneBR(s.phone):String(s.phone||"").replace(/\D/g,"");
      updates["whatsappQueue/"+key]={quoteId:q.id,quoteSource:q.source,quoteNumber:q.number,supplierId:s.id,supplierName:s.name,phone:phone,message:msg,status:"pending",createdAt:Date.now(),signature:"Powered by thIAguinho Soluções Digitais"};
    });
    db.ref().update(updates).then(function(){alert(chosen.length+" mensagem(ns) na fila.");setOpenPanel(source,id,"send");});
  };

  window.setOpenPanel=function(source,id,mode){window.uiState.openPanels[K(source,id)]=mode;renderQuotes(allQuotes());};
  window.showComparison=function(source,id){setOpenPanel(source,id,"comparison");};
  window.showItems=function(source,id){setOpenPanel(source,id,"items");};
  window.showRaw=function(source,id){setOpenPanel(source,id,"raw");};
  window.showSend=function(source,id){setOpenPanel(source,id,"send");};

  window.renderQuotes=function(qs){
    qs=qs||((typeof allQuotes==="function")?allQuotes():[]);
    var el=document.getElementById("quotesList");
    if(!el)return;
    if(!qs.length){el.innerHTML='<p class="muted">Nenhuma cotação criada.</p>';return;}
    el.innerHTML=qs.map(function(q){
      var answered=(q.items||[]).filter(function(it){return !!best(q,it);}).length;
      var lucro=0;(q.items||[]).forEach(function(it){var b=best(q,it);if(b)lucro+=Number(it.saleTotal||0)-(Number(b.price||0)*Number(it.qty||1));});
      var v=q.vehicle||{};
      var mode=window.uiState.openPanels[K(q.source,q.id)]||"";
      var detail="";
      if(mode==="comparison")detail=comparison(q);
      if(mode==="items")detail=items(q);
      if(mode==="raw")detail=raw(q);
      if(mode==="send")detail=send(q);
      return '<div class="quote '+(String(q.status).toLowerCase().includes("cancel")?"canceled":(statusOpen(q.status)?"":"closed"))+'"><h3>'+E(q.number)+' <span class="pill">'+E(q.source)+'</span> <span class="pill">'+E(q.status)+'</span></h3><p class="muted">'+E([v.marca||v.brand,v.modelo||v.model,v.ano||v.year,v.placa||v.plate].filter(Boolean).join(" "))+' — '+(q.items||[]).length+' item(ns) — respondidos '+answered+'/'+(q.items||[]).length+'</p><p><b>Lucro estimado:</b> <span class="'+(lucro>=0?'ok':'bad')+'">'+M(lucro)+'</span></p><div class="row"><button onclick="showComparison(\''+q.source+'\',\''+q.id+'\')">Comparar respostas</button><button class="light" onclick="showItems(\''+q.source+'\',\''+q.id+'\')">Ver peças</button><button class="light" onclick="showRaw(\''+q.source+'\',\''+q.id+'\')">Respostas WhatsApp</button><button class="light" onclick="showSend(\''+q.source+'\',\''+q.id+'\')">Enviar fornecedores</button><button class="green" onclick="generateOC(\''+q.source+'\',\''+q.id+'\')">Gerar OC</button><button class="light" onclick="editQuote(\''+q.source+'\',\''+q.id+'\')">Editar</button>'+(statusOpen(q.status)?'<button class="amber" onclick="setQuoteStatus(\''+q.source+'\',\''+q.id+'\',\'fechada\')">Encerrar</button><button class="red" onclick="setQuoteStatus(\''+q.source+'\',\''+q.id+'\',\'cancelada\')">Cancelar</button>':'<button class="green" onclick="setQuoteStatus(\''+q.source+'\',\''+q.id+'\',\'aberta\')">Reabrir</button>')+'<button class="red" onclick="deleteQuote(\''+q.source+'\',\''+q.id+'\')">Excluir</button></div>'+detail+'</div>';
    }).join("");
  };

  window.editSupplier=function(root,id){
    var src=(root==="suppliers"?(suppliers||{}):(fornecedores||{}));
    var s=src[id]||{};
    window.editingSupplier={root:root,id:id};
    document.getElementById("supName").value=s.name||s.nome||"";
    document.getElementById("supPhone").value=s.phone||s.whatsapp||"";
    document.getElementById("supTypes").value=(s.types||s.tipos||[]).join(", ");
    document.getElementById("supObs").value=s.obs||"";
    alert("Fornecedor carregado para edição. Ajuste os campos e clique em Salvar fornecedor.");
  };
  window.clearSupplierForm=function(){window.editingSupplier=null;["supName","supPhone","supTypes","supObs"].forEach(function(i){var el=document.getElementById(i);if(el)el.value="";});};
  window.setSupplierActive=function(root,id,active){var path=(root==="suppliers"?"suppliers/":"fornecedores/")+id;var data=root==="suppliers"?{active:active,updatedAt:Date.now()}:{ativo:active,atualizadoEm:new Date().toISOString()};db.ref(path).update(data);};
  window.deleteSupplier=function(root,id){if(!confirm("Excluir definitivamente este fornecedor?"))return;db.ref((root==="suppliers"?"suppliers/":"fornecedores/")+id).remove();};
  window.saveSupplier=function(){
    var data={name:document.getElementById("supName").value.trim(),phone:phoneBR(document.getElementById("supPhone").value),types:document.getElementById("supTypes").value.split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean),obs:document.getElementById("supObs").value.trim(),active:true,updatedAt:Date.now(),signature:"Powered by thIAguinho Soluções Digitais"};
    if(window.editingSupplier){
      var e=window.editingSupplier;
      var path=(e.root==="suppliers"?"suppliers/":"fornecedores/")+e.id;
      var payload=e.root==="suppliers"?data:{nome:data.name,whatsapp:data.phone,tipos:data.types,obs:data.obs,ativo:true,atualizadoEm:new Date().toISOString()};
      db.ref(path).update(payload).then(function(){clearSupplierForm();alert("Fornecedor atualizado.");});
    }else{
      var id=(typeof uid==="function")?uid("sup"):"sup_"+Date.now();
      db.ref("suppliers/"+id).set(Object.assign({id:id,createdAt:Date.now()},data)).then(function(){clearSupplierForm();});
    }
  };
  window.renderSuppliers=function(){
    var list=allSups();
    var html=list.length?'<div class="tablewrap"><table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Tipos</th><th>Obs.</th><th>Status</th><th>Origem</th><th>Ações</th></tr></thead><tbody>':"<p class='muted'>Sem fornecedores.</p>";
    if(list.length){
      list.forEach(function(s){
        html+='<tr><td>'+E(s.name)+'</td><td>'+E(s.phone)+'</td><td>'+E((s.types||[]).join(", "))+'</td><td>'+E(s.obs||"")+'</td><td>'+(s.active?'<span class="ok">Ativo</span>':'<span class="bad">Inativo</span>')+'</td><td>'+E(s.root)+'</td><td><button class="light" onclick="editSupplier(\''+s.root+'\',\''+s.id+'\')">Editar</button>'+(s.active?'<button class="amber" onclick="setSupplierActive(\''+s.root+'\',\''+s.id+'\',false)">Desativar</button>':'<button class="green" onclick="setSupplierActive(\''+s.root+'\',\''+s.id+'\',true)">Reativar</button>')+'<button class="red" onclick="deleteSupplier(\''+s.root+'\',\''+s.id+'\')">Excluir</button></td></tr>';
      });
      html+='</tbody></table></div>';
    }
    document.getElementById("suppliersList").innerHTML=html;
    var ps=document.getElementById("priceSupplier");
    if(ps)ps.innerHTML='<option value="">Selecione</option>'+list.map(function(s){return '<option value="'+E(s.id)+'">'+E(s.name)+'</option>';}).join("");
  };

  window.renderQueue=function(){
    var list=arrObj(whatsappQueue).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
    var html=list.length?'<div class="tablewrap"><table><thead><tr><th>Status</th><th>Fornecedor</th><th>Telefone</th><th>Mensagem</th></tr></thead><tbody>'+list.map(function(x){return '<tr><td>'+E(x.status)+'</td><td>'+E(x.supplierName||supplierName(x.supplierId))+'</td><td>'+E(x.phone||"")+'</td><td>'+E(String(x.message||"").slice(0,160))+'</td></tr>';}).join("")+'</tbody></table></div>':'<p class="muted">Fila vazia.</p>';
    var unmatched=arrObj(auditUnmatched).sort(function(a,b){return (b.receivedAt||0)-(a.receivedAt||0);});
    html+='<div class="fixPanel"><h3>⚠️ Respostas WhatsApp não vinculadas</h3>';
    if(!unmatched.length)html+='<p class="muted">Nenhuma resposta não vinculada.</p>';
    unmatched.forEach(function(x){html+='<div class="unmatched"><b>Remetente:</b> '+E(x.from)+'<br><b>Recebido:</b> '+(x.receivedAt?new Date(x.receivedAt).toLocaleString("pt-BR"):"")+'<pre>'+E(x.text||"")+'</pre></div>';});
    html+='</div>';
    document.getElementById("robotQueue").innerHTML=html;
  };
})();
