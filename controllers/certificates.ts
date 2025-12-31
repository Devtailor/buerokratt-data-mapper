import { generateKeyPairSync } from 'crypto';

import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/generate', (_req: Request, res: Response) => {
  try {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
    });

    res.json({
      publicKey,
      privateKey,
    });
  } catch (err) {
    console.error('RSA key generation error:', err);
    res.status(500).send('RSA key generation failed');
  }
});

export default router;
