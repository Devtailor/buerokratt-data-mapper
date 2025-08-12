import express from 'express';
import { body, matchedData, validationResult } from 'express-validator';

const router = express.Router();

router.post(
  '/detailed-information',
  [
    body('name').isString().withMessage('name is required and must be a string'),
    body('slots').isObject().withMessage('slots is required and must be a JSON object'),
    body('responses').isArray().withMessage('responses is required and must be an array'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, slots, responses } = matchedData(req);

    const responseText = 'utter_' + name;
    let result = responses.find((fd) => fd.name === responseText);
    result = result ? result.response[0].text : '';

    let ignoredIntents = [];
    const slotInfo = [];

    if (slots.ignored_intents) {
      ignoredIntents = slots.ignored_intents;
    }

    if (slots.required_slots) {
      for (const name of slots.required_slots) {
        const slotQuestion = responses.find((response) => {
          return response.name === 'utter_ask_' + name;
        });
        if (slotQuestion) {
          const newObj = {
            slot_name: name,
            question: slotQuestion.response[0].text,
          };
          slotInfo.push(newObj);
        }
      }
    }
    const formDetails = {
      formResponse: result,
      requiredSlots: slotInfo,
      ignoredIntents: ignoredIntents,
    };

    res.json(formDetails);
  },
);

export default router;
