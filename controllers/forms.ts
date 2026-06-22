import express, { Request, Response } from 'express';
import { body, matchedData, validationResult } from 'express-validator';

const router = express.Router();

type ResponseItem = {
  name: string;
  response: { text: string }[];
};

type Slots = {
  ignored_intents?: string[];
  required_slots?: string[];
};

type FormRequestBody = {
  name: string;
  slots: Slots;
  responses: ResponseItem[];
};

router.post(
  '/detailed-information',
  [
    body('name').isString().withMessage('name is required and must be a string'),
    body('slots').isObject().withMessage('slots is required and must be a JSON object'),
    body('responses').isArray().withMessage('responses is required and must be an array'),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, slots, responses } = matchedData(req) as FormRequestBody;

    const responseText = 'utter_' + name;
    let result = responses.find((fd) => fd.name === responseText);
    const formResponse = result ? result.response[0].text : '';

    let ignoredIntents: string[] = [];
    const slotInfo: { slot_name: string; question: string }[] = [];

    if (slots.ignored_intents) {
      ignoredIntents = slots.ignored_intents;
    }

    if (slots.required_slots) {
      for (const slotName of slots.required_slots) {
        const slotQuestion = responses.find((response) => {
          return response.name === 'utter_ask_' + slotName;
        });
        if (slotQuestion) {
          const newObj = {
            slot_name: slotName,
            question: slotQuestion.response[0].text,
          };
          slotInfo.push(newObj);
        }
      }
    }
    const formDetails = {
      formResponse,
      requiredSlots: slotInfo,
      ignoredIntents,
    };

    res.json(formDetails);
  },
);

export default router;
