#!/usr/bin/env node
/**
 * Generates the RS256 key pair for staff tokens.
 *   node deploy/office/generate-staff-keys.mjs
 * PRIVATE key  → website only (Railway variable JWT_PRIVATE_KEY, single line with \n)
 * PUBLIC key   → office vendor service (.env JWT_PUBLIC_KEY)
 * Printed to stdout ONLY; nothing is written to disk. Copy each into the right place and clear your terminal.
 */
import { generateKeyPairSync } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
const oneLine = (pem) => pem.trim().replace(/\n/g, '\n');
console.log('JWT_PRIVATE_KEY (website / Railway only):');
console.log(oneLine(privateKey.export({ type: 'pkcs8', format: 'pem' })));
console.log('\nJWT_PUBLIC_KEY (office vendor service):');
console.log(oneLine(publicKey.export({ type: 'spki', format: 'pem' })));
