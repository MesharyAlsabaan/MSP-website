import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'crypto';
import { StaffTokenService, StaffTokenOptions } from './staff-token.service';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

const base: StaffTokenOptions = {
  hsSecret: 'dev-secret',
  privateKey: privPem,
  publicKey: pubPem,
  issuer: 'msp-website',
  audience: ['msp-admin', 'vendor-service'],
  expiresIn: '15m',
};

describe('StaffTokenService', () => {
  const jwt = new JwtService({});

  it('signs access tokens with RS256 and standard claims when a private key is configured', async () => {
    const svc = new StaffTokenService(jwt, base);
    const token = await svc.signAccess({ sub: 'u1', email: 'a@x', role: 'SUPER_ADMIN' });
    const [header] = token.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString()).alg).toBe('RS256');
    const payload = await svc.verifyAccess(token);
    expect(payload).toMatchObject({ sub: 'u1', role: 'SUPER_ADMIN', iss: 'msp-website' });
    expect(payload.aud).toEqual(['msp-admin', 'vendor-service']);
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('is verifiable with the public key alone (what the office service holds)', async () => {
    const signer = new StaffTokenService(jwt, base);
    const verifier = new StaffTokenService(jwt, { ...base, privateKey: undefined, hsSecret: undefined });
    const token = await signer.signAccess({ sub: 'u1', email: 'a@x', role: 'VENDOR_REVIEWER' });
    await expect(verifier.verifyAccess(token, 'vendor-service')).resolves.toMatchObject({ role: 'VENDOR_REVIEWER' });
  });

  it('rejects a token for another audience, another issuer, or signed with a different key', async () => {
    const signer = new StaffTokenService(jwt, base);
    const verifier = new StaffTokenService(jwt, { ...base, privateKey: undefined });
    const token = await signer.signAccess({ sub: 'u1', email: 'a@x', role: 'EDITOR' });
    await expect(verifier.verifyAccess(token, 'other-service')).rejects.toThrow();
    const otherIssuer = new StaffTokenService(jwt, { ...base, issuer: 'someone-else' });
    await expect(verifier.verifyAccess(await otherIssuer.signAccess({ sub: 'u1', email: 'a@x', role: 'EDITOR' }))).rejects.toThrow();
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rogue = new StaffTokenService(jwt, { ...base, privateKey: otherKey.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string });
    await expect(verifier.verifyAccess(await rogue.signAccess({ sub: 'u1', email: 'a@x', role: 'SUPER_ADMIN' }))).rejects.toThrow();
  });

  it('refuses an HS256 token where RS256 is expected (no algorithm confusion)', async () => {
    const hs = new StaffTokenService(jwt, { ...base, privateKey: undefined, publicKey: undefined });
    const token = await hs.signAccess({ sub: 'u1', email: 'a@x', role: 'SUPER_ADMIN' });
    expect(JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).alg).toBe('HS256');
    const rs = new StaffTokenService(jwt, { ...base, privateKey: undefined });
    await expect(rs.verifyAccess(token)).rejects.toThrow();
  });

  it('falls back to HS256 for local development when no keys are configured', async () => {
    const svc = new StaffTokenService(jwt, { ...base, privateKey: undefined, publicKey: undefined });
    const token = await svc.signAccess({ sub: 'u1', email: 'a@x', role: 'EDITOR' });
    await expect(svc.verifyAccess(token)).resolves.toMatchObject({ sub: 'u1', iss: 'msp-website' });
  });
});
