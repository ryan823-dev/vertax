const http = require('http');
function req(opts, data) {
  return new Promise(r => {
    const q = http.request(opts, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => r({ s: res.statusCode, h: res.headers, b }));
    });
    q.on('error', e => r({ s: 0, e: e.message }));
    q.on('timeout', () => { q.destroy(); r({ s: 0, e: 'timeout' }); });
    if (data) q.write(data);
    q.end();
  });
}
async function main() {
  console.log('=== API Health Check ===');
  const r1 = await req({ hostname:'localhost', port:3000, path:'/api/auth/session', timeout:15000 });
  console.log('session:', r1.s, (r1.h && r1.h['content-type'] || ''), (r1.b || '').slice(0,80));
  const r2 = await req({ hostname:'localhost', port:3000, path:'/api/auth/csrf', timeout:15000 });
  console.log('csrf:', r2.s, (r2.h && r2.h['content-type'] || ''), (r2.b || '').slice(0,80));
  let tok, ck = '';
  try { tok = JSON.parse(r2.b).csrfToken; ck = (r2.h['set-cookie'] || []).map(c => c.split(';')[0]).join('; '); } catch {}
  if (!tok) { console.log('No CSRF token, stopping'); return; }
  const ld = 'csrfToken=' + tok + '&email=admin%40tdpaint.com&password=Tdpaint2026!&json=true';
  const r3 = await req({ hostname:'localhost', port:3000, path:'/api/auth/callback/credentials', method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':ck}, timeout:15000 }, ld);
  console.log('login:', r3.s, r3.h && r3.h.location || 'no-redirect');
  const lck = (r3.h && r3.h['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const allCk = ck + (lck ? '; ' + lck : '');
  const r4 = await req({ hostname:'localhost', port:3000, path:'/api/auth/session', headers:{'Cookie':allCk}, timeout:15000 });
  console.log('session-after-login:', r4.s);
  try {
    const sess = JSON.parse(r4.b);
    if (sess && sess.user) {
      console.log('USER:', sess.user.email, sess.user.name, 'tenant:', sess.user.tenantName || sess.user.tenantSlug || 'N/A');
      console.log('=== AUTH SYSTEM FULLY WORKING ===');
    } else {
      console.log('no user in session');
    }
  } catch { console.log('not json:', (r4.b || '').slice(0,150)); }
}
main().catch(e => console.error(e));
