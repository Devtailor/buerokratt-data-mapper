import express, { Request, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";

const router = express.Router();

router.post(
  "/generate-expression-date-days",
  [
    body("date").isString().withMessage("date must be a string"),
    body("days").isString().withMessage("days must be a string"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, days } = matchedData(req) as { date: string; days: string };

    const startFrom = Date.parse(date);
    const time = date.split("T")[1].split(".")[0];
    const cronTime = time.split(":").reverse().join(" ");
    const expression = `${cronTime} ? * ${days} *`;
    const result = {
      expression: expression,
      startDate: startFrom,
    };

    res.json(result);
  },
);

export default router;
