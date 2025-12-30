import express, { Request, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";

const router = express.Router();

router.post("/objects", (req: Request, res: Response) => {
  const { object1, object2 } = req.body as {
    object1: Record<string, any>;
    object2: Record<string, any>;
  };

  if (!object1 || !object2) {
    res.status(400).contentType("text/plain").send("Both objects are required");
    return;
  }

  res.json({ ...object1, ...object2 });
});

router.post("/response_objects", (req: Request, res: Response) => {
  const { object1, object2 } = req.body as {
    object1: Record<string, any>;
    object2: Record<string, any>;
  };

  if (!object1 || !object2) {
    res.status(400).contentType("text/plain").send("Both objects are required");
    return;
  }

  const response = { ...object1, ...object2 };

  for (const key in response) {
    if (Array.isArray(response[key])) {
      response[key].forEach((obj: any) => {
        if (obj.text) {
          obj.text = obj.text.replaceAll(/\n{2,}/g, "\n").replaceAll("\n", "\\n\\n");
        }
      });
    } else if (response[key] && response[key].text) {
      response[key].text = response[key].text.replaceAll(/\n{2,}/g, "\n").replaceAll("\n", "\\n\\n");
    }
  }
  res.json(response);
});

router.post("/remove-key", (req: Request, res: Response) => {
  const { object, key } = req.body as {
    object: Record<string, any>;
    key: string;
  };

  if (!object || !key) {
    res.status(400).contentType("text/plain").send("Both object and key are required");
    return;
  }

  delete object[key];
  res.json(object);
});

router.post(
  "/remove-array-value",
  [
    body("array").isArray().withMessage("array is required and must be an array"),
    body("value").isString().withMessage("value is required and must be a string"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { array, value } = matchedData(req) as {
      array: any[];
      value: string;
    };

    const filteredArray = array.filter((e) => e !== value);

    res.json(filteredArray);
  },
);

router.post(
  "/replace-array-element",
  [
    body("array").isArray().withMessage("array is required and must be an array"),
    body("element").isString().withMessage("element is required and must be a string"),
    body("newValue")
      .custom((value) => {
        return !!(typeof value === "string" || (typeof value === "object" && !Array.isArray(value)));
      })
      .withMessage("newValue is required and must be either a string or a JSON object"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { array, element, newValue } = matchedData(req) as {
      array: any[];
      element: string;
      newValue: any;
    };

    const index = array.indexOf(element);
    if (index === -1) {
      res.status(400).contentType("text/plain").send(`Array element ${element} is missing`);
      return;
    }

    array[index] = newValue;
    res.json(array);
  },
);

router.post("/multi-objects", (req: Request, res: Response) => {
  const objects = req.body as Record<string, Record<string, any>>;
  const objectCount = Object.keys(objects).length;
  if (objectCount > 0 && objectCount < 2) {
    return res.status(400).contentType("text/plain").send("At least two object are required");
  }

  const combinedObject = Object.values(objects).reduce((acc, obj) => ({ ...acc, ...obj }), {});

  res.json(combinedObject);
});

export default router;
