// Prints fresh secrets. Usage:  npm run keys
import crypto from 'node:crypto';
const b64u = (b) => Buffer.from(b).toString('base64url');
const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const j = kp.privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(j.x, 'base64url'), Buffer.from(j.y, 'base64url')]);
console.log(`SERVER_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`ADMIN_TOKEN=${crypto.randomBytes(24).toString('base64url')}`);
console.log(`VAPID_PUBLIC=${b64u(pub)}`);
console.log(`VAPID_PRIVATE=${j.d}`);
console.log(`# example app keys (for apps.config.json: use the pk_ value; keep the sk_ value on your website's backend only)`);
console.log(`pk_${crypto.randomBytes(18).toString('base64url')}`);
console.log(`sk_${crypto.randomBytes(32).toString('base64url')}`);
