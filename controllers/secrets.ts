import express, { Request, Response, Router } from "express";

import { getAllSecrets, getSecretsWithPriority } from "../js/secrets";

const router: Router = express.Router();

router.post("/get-all", (_req: Request, res: Response) => {
  const secrets = getAllSecrets();
  res.setHeader("Content-Type", "application/json; charset=utf8");
  return res.status(200).json({ ...secrets });
});

router.post("/get-with-priority", (req: Request, res: Response) => {
  const priority = req.query.priority as string | undefined;
  const result = getSecretsWithPriority(priority || "prod");
  res.setHeader("Content-Type", "application/json; charset=utf8");
  return res.status(200).json({ ...result });
});

export default router;
