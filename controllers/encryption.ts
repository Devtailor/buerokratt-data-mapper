import { KeyObject } from 'crypto';

import express, { Request, Response, Router } from 'express';

import { EncryptBodyBase, EncryptBodyWithKey } from '../interfaces';
import { aesEncrypt, base64Encrypt, rsaEncrypt, stringToBase64Encrypt, tripleDesEncrypt } from '../js/encryption';

const wrapper = function (config: { publicKey: KeyObject }): Router {
  const router = express.Router();

  router.post('/aes', (req: Request<{}, {}, EncryptBodyWithKey>, res: Response) => {
    const result = aesEncrypt({ content: req.body.content, key: req.body.key });
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/triple-des', (req: Request<{}, {}, EncryptBodyWithKey>, res: Response) => {
    const result = tripleDesEncrypt({ content: req.body.content, key: req.body.key });
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/base64', (req: Request<{}, {}, EncryptBodyBase>, res: Response) => {
    const result = base64Encrypt(req.body.content);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/object/base64', (req: Request, res: Response) => {
    const objects: Record<string, any> = req.body;
    const entries = Object.entries(objects).map(([key, value]: [string, string]) => {
      const result = stringToBase64Encrypt(value);
      return [key, result?.cipher];
    });

    const converted = Object.fromEntries(entries);
    res.json(converted);
  });

  router.post('/rsa', (req: Request<{}, {}, { content: string }>, res: Response) => {
    const result = rsaEncrypt(req.body.content, config.publicKey);
    return res.status(result.error ? 400 : 200).json(result);
  });

  return router;
};

export default wrapper;
