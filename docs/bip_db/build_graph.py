#!/usr/bin/env python3
"""Build a self-contained interactive dependency graph from dependencies.json.

Nodes:
  - service nodes (only those that participate in a dependency, as consumer or producer)
  - external office nodes (US, ZUS, MOPR, KRUS, PUP, ...)
Edges:
  - consumer service -> producer service  (internal document dependency)
  - consumer service -> external office   (external document dependency)

Output: graph.html (open in any browser, no server needed).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "dependencies.json")
OUT = os.path.join(HERE, "graph.html")

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

services = data["services"]
by_id = {s["id"]: s for s in services}

# ---- collect nodes & edges --------------------------------------------------
nodes = {}          # id -> node dict
edges = []          # list of edge dicts
offices = {}        # office code -> label
dept_colors = {}

PALETTE = [
    "#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#76b7b2",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
    "#86bcb6", "#d37295", "#a0cbe8", "#ffbe7d", "#8cd17d",
    "#499894", "#f1ce63", "#fabfd2", "#d4a6c8", "#79706e",
]


def dept_color(dept):
    if dept not in dept_colors:
        dept_colors[dept] = PALETTE[len(dept_colors) % len(PALETTE)]
    return dept_colors[dept]


def add_service_node(sid):
    s = by_id.get(sid)
    if s is None:
        return
    if sid in nodes:
        return
    dept = s.get("komorka", "—")
    nodes[sid] = {
        "id": sid,
        "label": sid,
        "title": f"<b>{sid}</b><br>{s['nazwa']}<br><i>{dept}</i>",
        "group": dept,
        "shape": "dot",
        "color": dept_color(dept),
        "kind": "service",
    }


for s in services:
    sid = s["id"]
    ext = s.get("requires_external_doc") or []
    internal = s.get("requires_internal_service") or []
    if not ext and not internal:
        continue  # skip isolated services

    add_service_node(sid)

    # external office dependencies
    for e in ext:
        office = e["office"]
        offices[office] = e.get("label", office)
        oid = f"OFFICE::{office}"
        if oid not in nodes:
            nodes[oid] = {
                "id": oid,
                "label": office,
                "title": f"<b>{office}</b><br>{e.get('label', office)}",
                "group": "__office__",
                "shape": "box",
                "color": "#c0392b",
                "kind": "office",
            }
        edges.append({
            "from": sid, "to": oid, "arrows": "to",
            "color": {"color": "#c0392b", "opacity": 0.5},
            "dashes": True,
            "title": f"requires external doc from {office}",
        })

    # internal producer dependencies
    for req in internal:
        doc = req.get("document", req.get("doc_key", "?"))
        for prod in req.get("produced_by", []):
            pid = prod["id"]
            add_service_node(pid)
            edges.append({
                "from": sid, "to": pid, "arrows": "to",
                "color": {"color": "#7f8c8d", "opacity": 0.6 if prod.get("primary") else 0.25},
                "width": 2 if prod.get("primary") else 1,
                "title": f"needs: {doc}" + ("" if prod.get("primary") else " (alt producer)"),
            })

# scale node size by total degree
deg = {nid: 0 for nid in nodes}
for e in edges:
    deg[e["from"]] = deg.get(e["from"], 0) + 1
    deg[e["to"]] = deg.get(e["to"], 0) + 1
for nid, n in nodes.items():
    n["value"] = deg.get(nid, 1)

node_list = list(nodes.values())

legend = [{"dept": d, "color": c} for d, c in sorted(dept_colors.items())]

payload = {
    "nodes": node_list,
    "edges": edges,
    "legend": legend,
    "summary": data.get("summary", {}),
    "counts": {
        "services": sum(1 for n in node_list if n["kind"] == "service"),
        "offices": sum(1 for n in node_list if n["kind"] == "office"),
        "edges": len(edges),
    },
}

# ---- render HTML ------------------------------------------------------------
HTML = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BIP Lublin — Graf zależności usług</title>
<script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
<style>
  :root { --bg:#1b1f27; --panel:#252b36; --ink:#e8ecf2; --muted:#9aa6b6; }
  * { box-sizing: border-box; }
  html,body { margin:0; height:100%; font-family:-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--ink); }
  #app { display:flex; height:100vh; }
  #graph { flex:1; height:100%; }
  #side { width:320px; background:var(--panel); padding:16px; overflow-y:auto; border-left:1px solid #000; }
  h1 { font-size:16px; margin:0 0 4px; }
  .sub { color:var(--muted); font-size:12px; margin-bottom:14px; }
  .stat { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; border-bottom:1px solid #333; }
  .section { margin-top:18px; }
  .section h2 { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:0 0 8px; }
  .legend-item { display:flex; align-items:center; gap:8px; font-size:12px; padding:2px 0; cursor:pointer; }
  .swatch { width:12px; height:12px; border-radius:3px; flex:none; }
  input[type=search] { width:100%; padding:8px; border-radius:6px; border:1px solid #3a4150; background:#1b1f27; color:var(--ink); }
  .hint { font-size:11px; color:var(--muted); margin-top:6px; line-height:1.4; }
  .controls { display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
  button { background:#3a4150; color:var(--ink); border:none; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer; }
  button:hover { background:#4a5365; }
</style>
</head>
<body>
<div id="app">
  <div id="graph"></div>
  <div id="side">
    <h1>BIP Lublin — graf zależności</h1>
    <div class="sub">Usługi miejskie i ich zależności od dokumentów (wewnętrznych i z urzędów zewnętrznych).</div>
    <div class="stat"><span>Usługi (w grafie)</span><b id="c-serv"></b></div>
    <div class="stat"><span>Urzędy zewnętrzne</span><b id="c-off"></b></div>
    <div class="stat"><span>Zależności (krawędzie)</span><b id="c-edge"></b></div>
    <div class="stat"><span>Usługi ogółem</span><b id="c-total"></b></div>

    <div class="section">
      <input id="search" type="search" placeholder="Szukaj usługi (ID lub nazwa)…">
      <div class="hint">Kliknij węzeł, aby podświetlić powiązania. Linia przerywana = dokument z urzędu zewnętrznego. Gruba linia = główny producent.</div>
      <div class="controls">
        <button id="btn-fit">Dopasuj widok</button>
        <button id="btn-physics">Zatrzymaj układ</button>
      </div>
    </div>

    <div class="section">
      <h2>Urzędy zewnętrzne</h2>
      <div id="offices"></div>
    </div>
    <div class="section">
      <h2>Komórki / wydziały</h2>
      <div id="legend"></div>
    </div>
  </div>
</div>
<script>
const DATA = __PAYLOAD__;

document.getElementById('c-serv').textContent = DATA.counts.services;
document.getElementById('c-off').textContent  = DATA.counts.offices;
document.getElementById('c-edge').textContent = DATA.counts.edges;
document.getElementById('c-total').textContent = (DATA.summary.total_services||'—');

const nodes = new vis.DataSet(DATA.nodes);
const edges = new vis.DataSet(DATA.edges);
const container = document.getElementById('graph');
const network = new vis.Network(container, {nodes, edges}, {
  nodes: { font:{color:'#e8ecf2', size:14}, scaling:{min:8, max:40, label:{min:11,max:22}} },
  edges: { smooth:{type:'continuous'}, selectionWidth:2 },
  groups: {},
  physics: { stabilization:{iterations:250}, barnesHut:{gravitationalConstant:-9000, springLength:140, springConstant:0.02, avoidOverlap:0.4} },
  interaction: { hover:true, tooltipDelay:120, navigationButtons:false },
});

// office legend
const offEl = document.getElementById('offices');
DATA.summary.external_office_hits && Object.entries(DATA.summary.external_office_hits).forEach(([code,hits])=>{
  const d = document.createElement('div'); d.className='legend-item';
  d.innerHTML = `<span class="swatch" style="background:#c0392b"></span><span>${code} <span style="color:#9aa6b6">(${hits})</span></span>`;
  d.onclick = ()=>focusNode('OFFICE::'+code);
  offEl.appendChild(d);
});

// dept legend
const legEl = document.getElementById('legend');
DATA.legend.forEach(l=>{
  const d = document.createElement('div'); d.className='legend-item';
  d.innerHTML = `<span class="swatch" style="background:${l.color}"></span><span>${l.dept}</span>`;
  d.onclick = ()=>highlightGroup(l.dept);
  legEl.appendChild(d);
});

function neighborsOf(id){
  const set = new Set([id]);
  edges.forEach(e=>{ if(e.from===id) set.add(e.to); if(e.to===id) set.add(e.from); });
  return set;
}
function focusNode(id){
  if(!nodes.get(id)) return;
  network.selectNodes([id]);
  network.focus(id, {scale:1.1, animation:true});
  dim(neighborsOf(id));
}
function highlightGroup(dept){
  const ids = new Set(DATA.nodes.filter(n=>n.group===dept).map(n=>n.id));
  dim(ids);
}
let dimmed=false;
function dim(keep){
  dimmed=true;
  nodes.update(DATA.nodes.map(n=>({id:n.id, opacity: keep.has(n.id)?1:0.12})));
}
function undim(){ if(!dimmed) return; dimmed=false; nodes.update(DATA.nodes.map(n=>({id:n.id, opacity:1}))); }

network.on('click', p=>{ if(p.nodes.length) dim(neighborsOf(p.nodes[0])); else undim(); });

document.getElementById('search').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  if(!q){ undim(); return; }
  const ids = new Set(DATA.nodes.filter(n=>
    n.id.toLowerCase().includes(q) || (n.title||'').toLowerCase().includes(q)
  ).map(n=>n.id));
  if(ids.size) dim(ids);
});
document.getElementById('btn-fit').onclick = ()=>{ undim(); network.fit({animation:true}); };
let physicsOn=true;
document.getElementById('btn-physics').onclick = (e)=>{
  physicsOn=!physicsOn; network.setOptions({physics:{enabled:physicsOn}});
  e.target.textContent = physicsOn?'Zatrzymaj układ':'Wznów układ';
};
network.once('stabilizationIterationsDone', ()=> network.fit());
</script>
</body>
</html>
"""

html = HTML.replace("__PAYLOAD__", json.dumps(payload, ensure_ascii=False))
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Wrote {OUT}")
print(f"  service nodes: {payload['counts']['services']}")
print(f"  office nodes : {payload['counts']['offices']}")
print(f"  edges        : {payload['counts']['edges']}")
print(f"  departments  : {len(legend)}")
