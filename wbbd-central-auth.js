/* Website Builders BD — Supabase password + Central email OTP + Web Push.
   No private API, SMTP, VAPID, or service-role secret belongs in this file. */
(() => {
  'use strict';
  if (window.__WBBD_CENTRAL_AUTH__) return;
  window.__WBBD_CENTRAL_AUTH__ = true;
  window.WBBD_MFA_VERIFIED = false;
  const C = window.WBBD_CENTRAL_CONFIG || {};
  const ADMIN = 'sopnilprodhan13@gmail.com', SESSION_KEY = 'wbbd_session';
  const MARKER_KEY = 'wbbd_otp_verified', BOOT_KEY = 'wbbd_otp_boot_checked';
  const $ = (s, root = document) => root.querySelector(s);
  const apiBase = String(C.apiBase || '').replace(/\/+$/, '');
  const ready = /^https:\/\//i.test(apiBase) && !apiBase.includes('YOUR-CENTRAL-SERVER-DOMAIN') && !!C.projectSlug;
  let preAuth = null, pending = null, resendClock = null, expiryClock = null, attempts = 0;

  function client(persist) {
    if (!window.supabase?.createClient) throw new Error('Supabase client library did not load.');
    if (!C.supabaseUrl || !C.supabaseAnonKey) throw new Error('Supabase public configuration is missing.');
    return window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
      auth: { persistSession: persist, autoRefreshToken: persist, detectSessionInUrl: false }
    });
  }
  const temp = () => preAuth || (preAuth = client(false));
  const auth = () => {
    if (!window.WBBD_SUPABASE_CLIENT) throw new Error('The main website Supabase client is not ready. Please refresh and try again.');
    return window.WBBD_SUPABASE_CLIENT;
  };
  const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
  const json = s => { try { return JSON.parse(s || 'null'); } catch { return null; } };
  function message(s, ok) { const e = $('#authErr'); if (e) { e.textContent = s || ''; e.style.color = ok ? '#15803d' : ''; } }
  function busy(on, label) { const b = $('#authSubmit'); if (b) { b.disabled = !!on; if (label) b.textContent = label; } }
  function captcha() {
    const q = $('#captchaQuestion')?.textContent || '', a = $('#captchaAnswer')?.value, m = q.match(/(\d+)\s*\+\s*(\d+)/);
    if (!m || a === '' || Number(a) !== Number(m[1]) + Number(m[2])) throw new Error('Human verification failed. Please solve the new question.');
  }
  function friendly(e) {
    const s = String(e?.message || '').toLowerCase();
    if (s.includes('invalid login')) return 'Wrong email or password. Please try again.';
    if (s.includes('not confirmed') || s.includes('email not confirmed')) return 'Please confirm your account email, then log in.';
    if (s.includes('already registered')) return 'This email already has an account. Please log in.';
    if (s.includes('rate limit') || s.includes('too many')) return 'Too many attempts. Wait a few minutes and try again.';
    return e?.message || 'Something went wrong. Please try again.';
  }
  async function api(path, body, token, method = 'POST') {
    if (!ready) throw new Error('Central OTP Server URL is not configured. OTP login remains disabled.');
    let r;
    try {
      r = await fetch(apiBase + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: method === 'GET' ? undefined : JSON.stringify(Object.assign({ projectSlug: C.projectSlug }, body || {})),
        cache: 'no-store', credentials: 'omit'
      });
    } catch { throw new Error('Could not reach the Central OTP Server. Try again later.'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || ('Central Server returned ' + r.status + '.'));
    return data;
  }
  async function signup(email, password) {
    const name = String($('#aName')?.value || '').trim();
    if (!name) throw new Error('Please enter your full name.');
    if (!emailOk(email)) throw new Error('Enter a valid email address.');
    const { data, error } = await temp().auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw new Error(friendly(error));
    if (data.session) await temp().auth.signOut({ scope: 'local' });
    message(data.session ? 'Account created. Now log in with your email and password.' : 'Account created. Confirm your email if requested, then log in.', true);
    setTimeout(() => location.assign('login.html'), 700);
  }
  async function login(email, password) {
    if (!emailOk(email)) throw new Error('Enter a valid email address.');
    if (!ready) throw new Error('The Central OTP Server URL is not configured yet. OTP login is disabled until deployment is complete.');
    const { data, error } = await temp().auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error));
    const s = data.session;
    if (!data.user || !s?.access_token || !s?.refresh_token) throw new Error('Could not create a temporary login session.');
    const { data: p, error: pe } = await temp().from('profiles').select('id,email,name,role').eq('id', data.user.id).maybeSingle();
    if (pe || !p) { await temp().auth.signOut({ scope: 'local' }); throw new Error('Your account profile is not ready. Contact the website administrator.'); }
    if (email.toLowerCase() === ADMIN && p.role !== 'admin') { await temp().auth.signOut({ scope: 'local' }); throw new Error('This email is not marked as Admin in the website database.'); }
    const sent = await api('/api/v1/public/otp/send', { email, userId: data.user.id }, s.access_token);
    pending = { email, userId: data.user.id, profile: p, accessToken: s.access_token, refreshToken: s.refresh_token, challengeId: sent.challengeId };
    showOtp(email, Number(sent.expiresIn) || 300, Number(sent.resendAfter) || 60);
  }
  function maskEmail(e) {
    const i = e.indexOf('@'), local = e.slice(0, i), visible = local.length < 3 ? 1 : 2;
    return local.slice(0, visible) + '•'.repeat(Math.max(4, Math.min(9, local.length - visible))) + e.slice(i);
  }
  function stopClocks() { clearInterval(resendClock); clearInterval(expiryClock); resendClock = expiryClock = null; }
  function showOtp(email, expires, resend) {
    attempts = 0;
    const form = $('#authForm'), modal = form?.closest('.md');
    if (!form || !modal) throw new Error('Login form or dialog was not found.');
    form.style.display = 'none';
    ['#authTitle', '.md > .note', '.md > .tabs'].forEach(s => { const e = $(s); if (e) e.classList.add('wbbd-auth-hidden'); });
    modal.classList.add('wbbd-otp-active');
    let card = $('#wbbdOtpChallenge');
    if (!card) {
      card = document.createElement('section'); card.id = 'wbbdOtpChallenge'; card.className = 'wbbd-otp-screen';
      card.innerHTML =
        '<div class="wbbd-otp-progress"><span class="done">✓ <b>Password</b></span><i></i><span class="current">2 <b>Email code</b></span></div>' +
        '<img class="wbbd-otp-logo" src="assets/logo.png" alt="Website Builders BD">' +
        '<div class="wbbd-otp-heading"><span>ACCOUNT SECURITY</span><h3>Verify it’s you</h3><p>We sent a one-time sign-in code to your email address.</p><strong id="wbbdOtpEmail"></strong></div>' +
        '<form id="wbbdOtpForm"><label for="wbbdOtpCode">6-digit verification code</label><input id="wbbdOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" minlength="6" pattern="[0-9]{6}" required placeholder="• • • • • •"><div class="wbbd-otp-meta"><span id="wbbdOtpExpiry">Code expires in 05:00</span><span>🔒 One-time code</span></div><p id="wbbdOtpStatus" role="status" aria-live="polite"></p><button class="btn p" id="wbbdOtpVerify" type="submit">Verify &amp; continue →</button></form>' +
        '<div class="wbbd-otp-resend"><span>Didn’t receive the email?</span><button type="button" id="wbbdOtpResend" disabled>Resend code in 60s</button></div>' +
        '<button type="button" id="wbbdOtpCancel" class="wbbd-otp-back">← Use a different account</button>';
      form.insertAdjacentElement('afterend', card);
      $('#wbbdOtpForm', card).addEventListener('submit', verifyOtp);
      $('#wbbdOtpResend', card).addEventListener('click', resendOtp);
      $('#wbbdOtpCancel', card).addEventListener('click', cancel);
      $('#wbbdOtpCode', card).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
    }
    $('#wbbdOtpEmail').textContent = maskEmail(email);
    countdown(resend, expires);
    setTimeout(() => $('#wbbdOtpCode')?.focus(), 50);
  }
  function countdown(resend, expires) {
    stopClocks();
    const rb = $('#wbbdOtpResend'), exp = $('#wbbdOtpExpiry');
    let left = Math.max(1, resend), until = Date.now() + Math.max(1, expires) * 1000;
    if (rb) { rb.disabled = true; rb.textContent = 'Resend code in ' + left + 's'; }
    resendClock = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(resendClock); resendClock = null; if (rb) { rb.disabled = false; rb.textContent = 'Resend code'; } }
      else if (rb) rb.textContent = 'Resend code in ' + left + 's';
    }, 1000);
    const tick = () => {
      const n = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (exp) exp.textContent = n ? 'Code expires in ' + String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0') : 'Code expired. Request a new code.';
      if (!n) { clearInterval(expiryClock); expiryClock = null; }
    };
    tick(); expiryClock = setInterval(tick, 1000);
  }
  async function resendOtp() {
    if (!pending) return;
    const b = $('#wbbdOtpResend'), status = $('#wbbdOtpStatus');
    if (b) b.disabled = true; if (status) status.textContent = 'Sending a new code…';
    try {
      const r = await api('/api/v1/public/otp/send', { email: pending.email, userId: pending.userId }, pending.accessToken);
      pending.challengeId = r.challengeId;
      if (status) status.textContent = 'A new code has been sent. Check your inbox.';
      countdown(Number(r.resendAfter) || 60, Number(r.expiresIn) || 300);
      const input = $('#wbbdOtpCode'); if (input) { input.value = ''; input.focus(); }
    } catch (e) { if (status) status.textContent = friendly(e); if (b) { b.disabled = false; b.textContent = 'Try resend again'; } }
  }
  async function verifyOtp(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    const code = String($('#wbbdOtpCode')?.value || '').replace(/\D/g, ''), status = $('#wbbdOtpStatus'), button = $('#wbbdOtpVerify');
    if (!pending) { if (status) status.textContent = 'Login session expired. Start again.'; return; }
    if (!/^\d{6}$/.test(code)) { if (status) status.textContent = 'Enter all 6 digits.'; return; }
    button.disabled = true; button.textContent = 'Verifying…'; if (status) status.textContent = '';
    try {
      const v = await api('/api/v1/public/otp/verify', { email: pending.email, userId: pending.userId, challengeId: pending.challengeId, code }, pending.accessToken);
      const r = await api('/api/v1/public/otp/ticket/redeem', { ticket: v.ticket, userId: pending.userId }, pending.accessToken);
      if (!r.verified || String(r.email).toLowerCase() !== pending.email || (r.userId && r.userId !== pending.userId)) throw new Error('OTP verification ticket could not be confirmed.');
      const p = pending.profile, uid = pending.userId;
      const { data, error } = await auth().auth.setSession({ access_token: pending.accessToken, refresh_token: pending.refreshToken });
      if (error || data.session?.user?.id !== uid) throw new Error('Verified OTP, but the website session could not be created.');
      const { data: allowed, error: rpcError } = await auth().rpc('is_mfa_verified');
      if (rpcError || allowed !== true) {
        await auth().auth.signOut().catch(() => {});
        throw new Error('Central Server has not activated MFA for this Supabase session. Contact the administrator.');
      }
      window.WBBD_MFA_VERIFIED = true;
      await temp().auth.signOut({ scope: 'local' }).catch(() => {});
      localStorage.setItem(MARKER_KEY, JSON.stringify({ uid, expiresAt: Date.now() + 12 * 60 * 60 * 1000 }));
      sessionStorage.removeItem(BOOT_KEY);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: p.email, name: p.name || p.email, role: p.role, uid: p.id, loginAt: new Date().toISOString() }));
      pending.accessToken = ''; pending.refreshToken = ''; pending = null; stopClocks();
      if (status) status.textContent = 'Email verified. Opening your account…';
      button.textContent = 'Success ✓'; setTimeout(() => location.replace('index.html'), 300);
    } catch (e) {
      attempts++; if (status) status.textContent = friendly(e);
      button.disabled = false; button.textContent = 'Verify & continue →';
      if (attempts >= 5) await cancel();
    }
  }
  async function cancel() {
    stopClocks();
    if (pending) { pending.accessToken = ''; pending.refreshToken = ''; }
    pending = null; attempts = 0;
    if (preAuth) await preAuth.auth.signOut({ scope: 'local' }).catch(() => {});
    const card = $('#wbbdOtpChallenge'); if (card) card.remove();
    const f = $('#authForm'); if (f) f.style.display = '';
    f?.closest('.md')?.classList.remove('wbbd-otp-active');
    ['#authTitle', '.md > .note', '.md > .tabs'].forEach(s => $(s)?.classList.remove('wbbd-auth-hidden'));
    message('Login cancelled. Enter your email and password to start again.'); busy(false, 'Login');
  }
  document.addEventListener('submit', async event => {
    if (event.target?.id !== 'authForm') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if ($('#wbbdOtpChallenge')) return;
    const tab = $('[data-tab].on')?.dataset.tab || (document.body.dataset.page === 'signup' ? 'signup' : 'login');
    const email = String($('#aEmail')?.value || '').trim().toLowerCase(), password = String($('#aPass')?.value || '');
    try {
      captcha(); busy(true, tab === 'signup' ? 'Creating account…' : 'Checking password…'); message('');
      if (tab === 'signup') await signup(email, password); else await login(email, password);
    } catch (e) { message(friendly(e)); }
    finally { if (!$('#wbbdOtpChallenge')) busy(false, tab === 'signup' ? 'Sign up' : 'Login'); }
  }, true);
  document.addEventListener('click', event => {
    if ($('#wbbdOtpChallenge') && (event.target?.closest?.('[data-close]') || event.target === $('#authMo'))) {
      event.preventDefault(); event.stopImmediatePropagation(); cancel();
    }
    if (event.target?.closest?.('#adOut, #upOut')) { window.WBBD_MFA_VERIFIED = false; localStorage.removeItem(MARKER_KEY); sessionStorage.removeItem(SESSION_KEY); }
  }, true);

  async function enforceSession() {
    try {
      const c = auth(), { data } = await c.auth.getSession(), s = data?.session;
      if (!s) { sessionStorage.removeItem(BOOT_KEY); return; }
      const { data: allowed, error } = await c.rpc('is_mfa_verified'), marker = json(localStorage.getItem(MARKER_KEY));
      if (!error && allowed === true && marker?.uid === s.user.id && Number(marker.expiresAt) > Date.now()) { window.WBBD_MFA_VERIFIED = true; return; }
      window.WBBD_MFA_VERIFIED = false;
      sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(MARKER_KEY); await c.auth.signOut();
      if (!sessionStorage.getItem(BOOT_KEY)) { sessionStorage.setItem(BOOT_KEY, '1'); location.reload(); }
    } catch (e) { console.warn('[WBBD MFA] Session check failed:', e?.message || e); }
  }
  window.addEventListener('load', enforceSession, { once: true });
})();
