import type { ShareView } from "./service"
import { shareDownloadable, shareExpired, shareLimitReached } from "./service"

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #0a0a0b; color: #ededed; }
  .card { width: 100%; max-width: 420px; background: #141416; border: 1px solid #26262a;
    border-radius: 16px; padding: 28px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .icon { width: 56px; height: 56px; margin: 0 auto 16px; display: grid; place-items: center;
    border-radius: 14px; background: #1e1e22; color: #8b8b94; }
  .name { font-size: 18px; font-weight: 600; word-break: break-word; }
  .meta { color: #8b8b94; font-size: 13px; margin-top: 6px; }
  .by { color: #b4b4bd; font-size: 13px; margin-top: 14px; }
  .status { font-size: 13px; margin-top: 4px; }
  .ok { color: #8b8b94; } .warn { color: #f87171; }
  .btn { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; width: 100%;
    justify-content: center; padding: 11px 16px; border-radius: 10px; border: 0; cursor: pointer;
    background: #ededed; color: #0a0a0b; font-size: 14px; font-weight: 600; text-decoration: none; }
  .btn[aria-disabled="true"] { opacity: .4; pointer-events: none; }
  .foot { margin-top: 18px; font-size: 11px; color: #56565c; }
</style></head>
<body><div class="card">${body}</div></body></html>`

/** Full landing page for a share link (centered file, sharer, expiry countdown, download). */
export const renderSharePage = (view: ShareView, directUrl: string): string => {
  const { share, node, ownerName } = view
  const downloadable = shareDownloadable(share)
  const remaining =
    share.maxDownloads != null ? Math.max(0, share.maxDownloads - share.downloadCount) : null

  const statusLine = shareExpired(share)
    ? `<p class="status warn">This link has expired.</p>`
    : shareLimitReached(share)
      ? `<p class="status warn">This link has reached its download limit.</p>`
      : share.expiresAt
        ? `<p class="status ok" id="countdown" data-expires="${share.expiresAt.toISOString()}">Calculating…</p>`
        : `<p class="status ok">This link doesn't expire.</p>`

  const limitLine =
    remaining != null && !shareExpired(share)
      ? `<p class="meta">${remaining} download${remaining === 1 ? "" : "s"} remaining</p>`
      : ""

  const button = downloadable
    ? `<a class="btn" data-mime="${escapeHtml(node.mimeType ?? "")}" href="${escapeHtml(directUrl)}">Download</a>`
    : `<span class="btn" aria-disabled="true">Unavailable</span>`

  const countdownScript = share.expiresAt
    ? `<script>(function(){var el=document.getElementById('countdown');if(!el)return;var exp=new Date(el.dataset.expires).getTime();function pad(n){return String(n).padStart(2,'0')}function tick(){var d=exp-Date.now();if(d<=0){el.textContent='This link has expired.';el.className='status warn';var b=document.querySelector('.btn');if(b){b.setAttribute('aria-disabled','true')}return}var h=Math.floor(d/3.6e6),m=Math.floor(d%3.6e6/6e4),s=Math.floor(d%6e4/1e3);el.textContent='Expires in '+(h>0?h+'h ':'')+pad(m)+'m '+pad(s)+'s';setTimeout(tick,1000)}tick()})();</script>`
    : ""

  const e2eScript = `<script>(function(){var p=new URLSearchParams(location.hash.slice(1));var k=p.get('k');if(!k)return;var n=p.get('n');var fname=n?decodeURIComponent(n):'download';if(n){var ne=document.querySelector('.name');if(ne)ne.textContent=fname;document.title=fname+' · shared'}var btn=document.querySelector('.btn[href]');if(!btn)return;var url=btn.getAttribute('href');var mime=btn.getAttribute('data-mime')||'';btn.removeAttribute('href');btn.style.cursor='pointer';btn.textContent='Decrypt & view';var sc=document.createElement('script');sc.src='/_sodium.js';document.head.appendChild(sc);async function ready(){for(var i=0;i<400&&!window.sodium;i++){await new Promise(function(r){setTimeout(r,50)})}if(!window.sodium)throw 0;await window.sodium.ready;return window.sodium}var objectUrl=null;function save(){var a=document.createElement('a');a.href=objectUrl;a.download=fname;document.body.appendChild(a);a.click();a.remove()}btn.addEventListener('click',function(e){e.preventDefault();if(objectUrl){save();return}btn.setAttribute('aria-disabled','true');btn.textContent='Decrypting…';(async function(){try{var s=await ready();var key=s.from_base64(decodeURIComponent(k),s.base64_variants.ORIGINAL);var resp=await fetch(url);if(!resp.ok)throw 0;var buf=new Uint8Array(await resp.arrayBuffer());var nb=s.crypto_secretbox_NONCEBYTES;var plain=s.crypto_secretbox_open_easy(buf.slice(nb),buf.slice(0,nb),key);objectUrl=URL.createObjectURL(new Blob([plain],{type:mime}));btn.removeAttribute('aria-disabled');if(mime.indexOf('image/')===0){var img=document.createElement('img');img.src=objectUrl;img.style.cssText='width:100%;border-radius:12px;margin-top:18px;display:block';var ic=document.querySelector('.icon');if(ic)ic.style.display='none';btn.parentNode.insertBefore(img,btn);btn.textContent='Download'}else{save();btn.textContent='Download again'}}catch(err){btn.textContent='Decryption failed';btn.removeAttribute('aria-disabled')}})()})})();</script>`

  return page(
    `${node.name} · shared`,
    `<div class="icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg></div>
     <div class="name">${escapeHtml(node.name)}</div>
     <p class="meta">${formatBytes(node.sizeBytes ?? 0)}</p>
     ${statusLine}
     ${limitLine}
     <p class="by">Shared by ${escapeHtml(ownerName)}</p>
     ${button}
     ${countdownScript}
     ${e2eScript}`,
  )
}

export const renderShareNotFound = (): string =>
  page(
    "Link unavailable",
    `<div class="icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6m0-6l-6 6"/></svg></div>
     <div class="name">Link unavailable</div>
     <p class="meta">This share link is invalid, expired, or has been removed.</p>`,
  )
