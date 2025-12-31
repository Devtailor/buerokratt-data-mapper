import { createSign, createVerify, generateKeyPairSync } from 'crypto';

import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import certificatesRouter from './certificates';

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return { ...actual, generateKeyPairSync: vi.fn(actual.generateKeyPairSync) };
});

describe('certificates controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/certificates', certificatesRouter);
  });

  describe('GET /certificates/generate', () => {
    it('should generate RSA key pair with public and private keys (format and content checks)', async () => {
      const res = await request(app).get('/certificates/generate');

      const privateKeyContent = res.body.privateKey
        .replace('-----BEGIN RSA PRIVATE KEY-----', '')
        .replace('-----END RSA PRIVATE KEY-----', '')
        .replace(/\s/g, '');
      const publicKeyContent = res.body.publicKey
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '');

      expect(res.body).toHaveProperty('privateKey');
      expect(typeof res.body.privateKey).toBe('string');
      expect(res.body.privateKey).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(res.body.privateKey).toContain('-----END RSA PRIVATE KEY-----');
      expect(privateKeyContent).toMatch(/^[A-Za-z0-9+/=]+$/);

      expect(res.body).toHaveProperty('publicKey');
      expect(typeof res.body.publicKey).toBe('string');
      expect(res.body.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(res.body.publicKey).toContain('-----END PUBLIC KEY-----');
      expect(publicKeyContent).toMatch(/^[A-Za-z0-9+/=]+$/);

      expect(res.status).toBe(200);
    });

    it('should generate RSA key pair with public and private keys (validity checks)', async () => {
      const res = await request(app).get('/certificates/generate');

      const { privateKey, publicKey } = res.body;
      const message = 'test message';

      const sign = createSign('RSA-SHA256');
      sign.update(message);
      sign.end();
      const signature = sign.sign(privateKey as string, 'base64');

      const verify = createVerify('RSA-SHA256');
      verify.update(message);
      verify.end();
      const isValidSignature = verify.verify(publicKey as string, signature, 'base64');

      expect(isValidSignature).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should generate different keys on each call', async () => {
      const res1 = await request(app).get('/certificates/generate');
      const res2 = await request(app).get('/certificates/generate');

      expect(res1.body.privateKey).not.toBe(res2.body.privateKey);
      expect(res1.body.publicKey).not.toBe(res2.body.publicKey);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should return 500 when key generation fails', async () => {
      (generateKeyPairSync as any).mockImplementationOnce(() => {
        throw new Error('key generation failed');
      });

      const res = await request(app).get('/certificates/generate');

      expect(res.text).toBe('RSA key generation failed');
      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });
});
