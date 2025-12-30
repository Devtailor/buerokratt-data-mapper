import express, { Request, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";

const router = express.Router();

router.post(
  "/array-elements-length",
  [
    body("array").isArray().withMessage("array is required and must be an array"),
    body("length").isNumeric().withMessage("length is required and must be a number"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { array, length } = matchedData(req) as {
      array: any[];
      length: number;
    };

    res.json(array.every((value) => value.length <= length));
  },
);

router.post("/validate-stories-rules", (req: Request, res: Response) => {
  const body = req.body as {
    rule?: { steps: Step[] };
    story?: { steps: Step[] };
  };
  const steps = (req as any).category === "rules" ? body.rule?.steps : body.story?.steps;

  if (!steps) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const isValid = validateStepsForNoConsecutiveDuplicates(steps);
  res.json({ result: isValid });
});

function validateStepsForNoConsecutiveDuplicates(steps: Step[]): boolean {
  if (!Array.isArray(steps)) return false;

  for (let i = 1; i < steps.length; i++) {
    const currentStep = steps[i];
    const previousStep = steps[i - 1];

    if (currentStep.intent && previousStep.intent) {
      if (currentStep.intent === previousStep.intent) {
        return false;
      }
    }

    if (currentStep.entities && previousStep.entities) {
      if (hasCommonElement(currentStep.entities, previousStep.entities)) {
        return false;
      }
    }
  }

  return true;
}

function hasCommonElement(arr1: { entity: string }[], arr2: { entity: string }[]): boolean {
  return arr1.some((element) => arr2.some((item) => item.entity === element.entity));
}

type Step = {
  intent?: string;
  entities?: { entity: string }[];
};

export default router;
