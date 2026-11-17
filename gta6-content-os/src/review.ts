/**
 * Painel de revisão (estático, gerado do banco). Embrião do Painel de Controle web (Fase 3).
 * Mostra radar, fila de pautas, roteiros com resultado dos gates, renders e candidatos de clip,
 * com o comando exato de aprovação ao lado de cada item.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { paths } from './core/config.js';
import { loadScripts } from './core/content.js';
import type { Repo } from './core/db.js';
import type { GateResult, NewsItem, Pauta } from './core/types.js';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function buildReview(repo: Repo): string {
  const out = join(paths.entregas, 'painel-revisao.html');
  const rel = (p: string) => relative(paths.entregas, p);
  const news = repo.list<NewsItem>('news').sort((a, b) => b.editorialPotential - a.editorialPotential);
  const pautas = repo.list<Pauta>('pauta').sort((a, b) => b.priority - a.priority);
  const scripts = loadScripts();
  const gate = (id: string, g: string) => repo.get<GateResult>('gate', `${id}:${g}`);
  const badge = (g: GateResult | null, label: string) =>
    `<span class="b ${g ? (g.passed ? 'ok' : 'bad') : 'na'}">${label} ${g ? (g.passed ? '✓' : '✗') : '—'}</span>`;

  const clipDir = join(paths.output, 'clip-demo-tos');
  const clips = existsSync(join(clipDir, 'candidates.json')) ? JSON.parse(readFileSync(join(clipDir, 'candidates.json'), 'utf8')) : null;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seis Estrelas — Revisão</title>
<style>
:root{--bg:#1E0F2E;--r:#2B1640;--l:#4A3570;--t:#FFFFFF;--m:#D9C2DF;--y:#FFD36B;--g:#2BD576;--red:#FF4D4D}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:15px/1.5 Inter,system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:32px 16px 80px}h1{font:800 30px/1.1 Inter;margin:0 0 4px}h1 span{color:var(--y)}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--m);margin:40px 0 12px;border-bottom:1px solid var(--l);padding-bottom:8px}
.sub{color:var(--m)}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:8px 10px;border-bottom:1px solid var(--l);text-align:left;vertical-align:top}
th{color:var(--m);font-weight:600;font-size:12px}a{color:var(--y)}.card{background:var(--r);border:1px solid var(--l);border-radius:12px;padding:18px;margin-bottom:14px}
.b{display:inline-block;font:700 11px/1 ui-monospace,monospace;padding:5px 7px;border-radius:5px;margin-right:6px;border:1px solid}
.ok{color:var(--g);border-color:var(--g)}.bad{color:var(--red);border-color:var(--red)}.na{color:var(--m);border-color:var(--l)}
code{font:12px ui-monospace,monospace;background:#000;padding:3px 6px;border-radius:4px;color:var(--y)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}video{width:100%;max-width:340px;border-radius:10px;background:#000;display:block}
.beat{border-left:3px solid var(--l);padding:4px 0 4px 12px;margin:8px 0}.beat small{color:var(--m)}.warn{color:var(--red)}
</style></head><body><main>
<h1>★6 SEIS ESTRELAS <span>· painel de revisão</span></h1>
<div class="sub">Gerado ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · nada aqui é publicado sem <code>npm run approve</code> + <code>npm run publish -- &lt;id&gt; --real</code></div>

<h2>Short piloto</h2>
${scripts
  .filter((s) => existsSync(join(paths.entregas, `${s.id}-v${s.version}.mp4`)))
  .map(
    (s) => `<div class="card grid"><video controls preload="metadata" src="${rel(join(paths.entregas, `${s.id}-v${s.version}.mp4`))}"></video><div>
<h3 style="margin:0">${esc(s.title)}</h3><p class="sub">${esc(s.promise)}</p>
${badge(gate(s.id, 'FATOS'), 'FATOS')}${badge(gate(s.id, 'CRIATIVIDADE'), 'CRIATIVIDADE')}${badge(gate(s.id, 'AUDIOVISUAL'), 'AUDIOVISUAL')}<span class="b ${repo.isApproved('render', `${s.id}-v${s.version}`) ? 'ok' : 'na'}">HUMANO ${repo.isApproved('render', `${s.id}-v${s.version}`) ? '✓' : 'pendente'}</span>
<p class="warn">Voz guia sintética (Piper). Substituir por narração humana antes de publicar.</p>
<p>Aprovar: <code>GTA_OS_REVIEWER="nome" npm run approve -- render ${s.id}-v${s.version}</code></p>
<p>Reprovar: <code>GTA_OS_REVIEWER="nome" npm run approve -- render ${s.id}-v${s.version} REPROVADO motivo…</code></p></div></div>`,
  )
  .join('')}

<h2>Roteiros (${scripts.length})</h2>
${scripts
  .map(
    (s) => `<details class="card"><summary><b>${esc(s.title)}</b> · ${s.format} · ${s.style} · ${s.claims.length} afirmações &nbsp; ${badge(gate(s.id, 'FATOS'), 'FATOS')}${badge(gate(s.id, 'CRIATIVIDADE'), 'CRIATIVIDADE')}</summary>
<p><b>Público:</b> ${esc(s.audience)}<br><b>Objetivo:</b> ${esc(s.goal)}<br><b>Promessa:</b> ${esc(s.promise)}<br><b>Gancho:</b> ${esc(s.hook)}<br><b>CTA:</b> ${esc(s.cta)}</p>
${s.beats.map((b) => `<div class="beat">${esc(b.narration)}<br><small>TELA: ${esc(b.onScreen)} · VISUAL: ${esc(b.visual)} · ANIMAÇÃO: ${esc(b.animation)} · ÁUDIO: ${esc(b.audio)}</small></div>`).join('')}
<p><b>Fontes:</b> ${s.sources.map((x) => `<a href="${esc(x.url)}">${esc(x.name)}</a>`).join(' · ')}</p>${s.notes ? `<p class="sub">Nota: ${esc(s.notes)}</p>` : ''}</details>`,
  )
  .join('')}

<h2>Fila de pautas</h2>
<table><tr><th>#</th><th>Prioridade</th><th>Pauta</th><th>Formato</th><th>Notas do índice</th></tr>
${pautas.map((p, i) => `<tr><td>${i + 1}</td><td>${p.priority}</td><td><b>${esc(p.title)}</b><br><span class="sub">${esc(p.angle)}</span></td><td>${p.format}</td><td class="sub">${esc(p.opportunity.notas.join('; '))}</td></tr>`).join('')}</table>

<h2>Radar de notícias (fontes oficiais)</h2>
<table><tr><th>Pot.</th><th>Status</th><th>Data</th><th>Título</th><th>Verificado</th><th>Fontes</th></tr>
${news.map((n) => `<tr><td>${n.editorialPotential}</td><td><span class="b ${n.status === 'CONFIRMADO' ? 'ok' : 'na'}">${n.status}</span></td><td>${n.publishedAt?.slice(0, 10) ?? ''}</td><td><a href="${esc(n.source.url)}">${esc(n.title)}</a></td><td class="sub">${n.lastVerifiedAt.slice(0, 16).replace('T', ' ')}</td><td>${1 + n.alsoReportedBy.length}</td></tr>`).join('')}</table>

${
  clips
    ? `<h2>Auto Clip Studio — demonstração (vídeo CC, NÃO publicável)</h2>
<p class="sub">${esc(clips.rights.license)}<br>${esc(clips.rights.notes)}</p>
<table><tr><th>Sinal</th><th>Disponibilidade</th></tr>${Object.entries(clips.signals).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="${String(v).startsWith('indispon') ? 'warn' : ''}">${esc(v)}</td></tr>`).join('')}</table>
<div class="grid" style="margin-top:14px">${clips.selected
        .map((c: any) => {
          const f = join(clipDir, 'clips', `${c.id}.mp4`);
          return `<div class="card">${existsSync(f) ? `<video controls preload="metadata" src="${rel(f)}"></video>` : ''}
<p><b>${c.id}</b> · ${c.start}s → ${c.end}s · score <b>${c.score}</b> (editorial ${c.editorial_score} / técnico ${c.technical_score})${c.spoiler_alert ? ' <span class="warn">⚠ spoiler</span>' : ''}</p>
<p class="sub">Gancho: “${esc(c.hook)}”</p><ul>${c.reason.map((r: string) => `<li>${esc(r)}</li>`).join('')}</ul>
<p class="sub">Contexto: ${esc(c.context_needed)}</p><details><summary>Transcrição</summary><p class="sub">${esc(c.transcript)}</p></details></div>`;
        })
        .join('')}</div>`
    : ''
}
</main></body></html>`;
  writeFileSync(out, html);
  return out;
}
