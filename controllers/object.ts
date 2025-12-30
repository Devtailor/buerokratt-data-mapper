import express, { Request, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";

import { isValidIntentName } from "../lib/helpers";

const router = express.Router();

router.post(
  "/rules/remove-by-intent-name",
  [
    body("rulesJson").isArray().withMessage("rulesJson is required and must be an array"),
    body("searchIntentName").isString().withMessage("searchIntentName is required and must be a string"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rulesJson, searchIntentName } = matchedData(req) as { rulesJson: any[]; searchIntentName: string };

    if (!isValidIntentName(searchIntentName)) {
      return res.status(400).send({ error: "Search intent name contains illegal characters" });
    }

    const strRegExPattern = ".*\\b" + searchIntentName + "\\b.*";
    const regExp = new RegExp(strRegExPattern);

    const result = rulesJson
      .map((entry) => {
        const containsSearchTerm = regExp.test(JSON.stringify(entry));
        if (!containsSearchTerm) return entry;
      })
      .filter((value) => value);

    return res.status(200).send({ result });
  },
);

router.post(
  "/responses/remove-by-intent-name",
  [
    body("responses").isObject().withMessage("responses is required and must be an object"),
    body("intent").isString().withMessage("intent is required and must be a string"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { responses, intent } = matchedData(req) as { responses: Record<string, any>; intent: string };

    if (!isValidIntentName(intent)) {
      return res.status(400).send({ error: "Intent name contains illegal characters" });
    }

    const pattern = new RegExp(`^utter_${intent}$`);

    const result = Object.entries(responses).reduce<Record<string, any>>((acc, [key, value]) => {
      if (!pattern.test(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    return res.status(200).send(result);
  },
);

router.post("/replace/key-value-in-obj", (req: Request, res: Response) => {
  let { object, oldKey, newKey, newValue } = req.body as {
    object: Record<string, any>;
    oldKey: string;
    newKey: string;
    newValue: any;
  };

  const result = Object.entries(object).reduce<Record<string, any>>((acc, [key, value]) => {
    if (key === oldKey) {
      acc[newKey] = newValue;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  res.json(result);
});

router.post(
  "/array/replace-next-element",
  [
    body("array").isArray().withMessage("array is required and must be an array"),
    body("element").isString().withMessage("element is required and must be a string"),
    body("newInput").isNumeric().withMessage("newInput is required and must be a number"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { array, element, newInput } = matchedData(req) as { array: string[]; element: string; newInput: number };

    const index = array.indexOf(element);

    if (index !== -1 && index < array.length - 1) {
      array[index + 1] = newInput.toString();
    }

    return res.status(200).send({ array });
  },
);

router.post(
  "/get-selected-csa-nps",
  [body("data").isArray().withMessage("data is required and must be an array")],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data } = matchedData(req) as { data: any[] };

    const response: any[] = [];
    const periodNpsObject: Record<string, any> = {};

    data.forEach((item) => {
      const { periodNps, ...rest } = item;
      response.push(rest);

      if (!periodNpsObject[item.customerSupportFullName]) {
        periodNpsObject[item.customerSupportFullName] = periodNps;
      }
    });

    return res.status(200).send({ response, periodNpsByCsa: periodNpsObject });
  },
);

export default router;
