import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/update-existing-response', (req: Request, res: Response) => {
  const {
    json,
    searchKey,
    newKey,
    newKeyValue,
    deleteOldValue = true,
    createIfAbsent = false,
  } = req.body as {
    json: Record<string, any>;
    searchKey: string;
    newKey: string;
    newKeyValue: string;
    deleteOldValue?: boolean;
    createIfAbsent?: boolean;
  };
  if (!json || !searchKey || !newKey || !newKeyValue) {
    return res.status(400).json({
      message: 'json, searchKey, newKey, newKeyValue are required fields',
    });
  }

  Object.entries(json).forEach(([key, _]) => {
    if (key.includes(searchKey)) {
      json[newKey] = [
        {
          text: newKeyValue,
        },
      ];
      if (deleteOldValue) delete json[key];
    } else if (createIfAbsent) {
      json[newKey] = [
        {
          text: newKeyValue,
        },
      ];
    }
  });

  return res.json(json);
});

export default router;
