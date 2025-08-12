import express from 'express';
import { body, matchedData, validationResult } from 'express-validator';

const router = express.Router();

router.post(
  '/array-elements-length',
  [
    body('array').isArray().withMessage('array is required and must be an array'),
    body('length').isNumeric().withMessage('length is required and must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { array, length } = matchedData(req);

    res.json(array.every((value) => value.length <= length));
  },
);

router.post('/validate-stories-rules', async (req, res) => {
  const steps = req.category === 'rules' ? req.body.rule.steps : req.body.story.steps;
  const isValid = validateStepsForNoConsecutiveDuplicates(steps);
  res.json({ result: isValid });
});

function validateStepsForNoConsecutiveDuplicates(steps) {
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

function hasCommonElement(arr1, arr2) {
  return arr1.some((element) => arr2.some((item) => item.entity === element.entity));
}

export default router;
