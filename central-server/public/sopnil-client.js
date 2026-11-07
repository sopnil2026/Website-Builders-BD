/*! Sopnil Central Server – tiny browser client (OTP + web push). Include with:
   <script src="https://YOUR-SERVER/client.js"></script>
   const sc = SopnilServer({ url: 'https://YOUR-SERVER', key: 'pk_…' });   // PUBLIC key only
*/
(function (g) {
  g.SopnilServer = function (cfg) {
    const base = String(cfg.url || '').replace(/\/+$/, '');
    async function call(path, body) {
      let r;
      try {
        r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg.key }, body: body ? JSON.stringify(body) : undefined });
      } catch (e) { const err = new Error('Cannot reach the server. Check your internet connection.'); err.code = 'network'; throw err; }
      let j = {}; try { j = await r.json(); } catch (e) { /* non-JSON */ }
      if (!r.ok || j.ok === false) { const err = new Error(j.message || 'Request failed'); err.code = j.error || 'error'; err.status = r.status; err.data = j; throw err; }
      return j;
    }
    const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
    return {
      sendOtp: (email, o) => call('/v1/otp/send', Object.assign({ email: email, purpose: 'login' }, o)),
      verifyOtp: (email, code, o) => call('/v1/otp/verify', Object.assign({ email: email, code: code, purpose: 'login' }, o)),
      /** Asks permission, registers the service worker you provide and stores the subscription on the server. */
      async enablePush(swPath, userId) {
        if (!('serviceWorker' in navigator) || !('PushManager' in g)) throw new Error('Push is not supported in this browser.');
        if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notification permission was not granted.');
        const reg = await navigator.serviceWorker.register(swPath || '/push-sw.js'); await navigator.serviceWorker.ready;
        const k = await call('/v1/push/vapid-public-key');
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.publicKey) }));
        await call('/v1/push/subscribe', { subscription: sub.toJSON(), userId: userId || '' });
        return sub;
      },
    };
  };
})(window);
