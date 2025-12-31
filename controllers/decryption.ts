import { KeyObject } from 'crypto';

import express, { Request, Response, Router } from 'express';

import { DecryptBodyBase, DecryptBodyWithKey } from '../interfaces';
import { aesDecrypt, base64Decrypt, rsaDecrypt, tripleDesDecrypt } from '../js/decryption';

const wrapper = function (config: { privateKey: KeyObject }): Router {
  const router = express.Router();

  router.post('/aes', (req: Request<{}, {}, DecryptBodyWithKey>, res: Response) => {
    const result = aesDecrypt({ cipher: req.body.cipher, key: req.body.key, isObject: req.body.isObject });
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/triple-des', (req: Request<{}, {}, DecryptBodyWithKey>, res: Response) => {
    const result = tripleDesDecrypt({ cipher: req.body.cipher, key: req.body.key, isObject: req.body.isObject });
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/base64', (req: Request<{}, {}, DecryptBodyBase>, res: Response) => {
    const result = base64Decrypt({ cipher: req.body.cipher, isObject: req.body.isObject });
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.post('/rsa', (req: Request<{}, {}, Pick<DecryptBodyBase, 'cipher'>>, res: Response) => {
    const result = rsaDecrypt(req.body.cipher, config.privateKey);
    return res.status(result.error ? 400 : 200).json(result);
  });

  return router;
};

export default wrapper;
