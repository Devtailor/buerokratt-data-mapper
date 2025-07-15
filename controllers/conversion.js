import express from "express";
import { parse, stringify } from "yaml";
import multer from "multer";
import Papa from "papaparse";
import base64ToText from "../js/util/base64ToText.js";
import { body, matchedData, validationResult } from "express-validator";
import ExcelJS from "exceljs";
import { convertJsonToYamlDomain } from "../js/convert/jsonToYamlDomain.js";

const router = express.Router();

router.post("/csv_to_json", multer().array("file"), (req, res) => {
  const file = base64ToText(req.body.file);
  const result = Papa.parse(file, { skipEmptyLines: true });
  res.json(result.data);
});

router.post("/yaml_to_json", multer().array("file"), (req, res) => {
  const file = base64ToText(req.body.file);
  const result = parse(file);
  res.json(result);
});

router.post("/json_to_yaml", (req, res) => {
  const result = stringify(req.body, { lineWidth: 0 });
  res.send({ json: result });
});

router.post("/json_to_yaml_domain", (req, res) => {
  try {
    const convertedYaml = convertJsonToYamlDomain(req.body);
    res.send({ json: convertedYaml });
  } catch (error) {
    res.status(500).json({ error: "Failed to create file", details: error.message });
  }
});

router.post("/json_to_yaml_data", (req, res) => {
  try {
    let result = stringify(req.body.data, { lineWidth: -1 });
    result = result.replace(/(\n[^\s].+?:)/g, "\n$1");
    result = result.trimStart();
    res.send({ yaml: result });
  } catch (error) {
    console.error("Error formatting yaml lines", error);
    const result = stringify(req.body.data);
    res.send({ yaml: result });
  }
});

router.post(
  "/string-replace",
  [
    body("data").isString().withMessage("data must be a string"),
    body("search").isString().withMessage("search must be a string"),
    body("replace").isString().withMessage("replace must be a string"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data, search, replace } = matchedData(req);
    if (search === "|") {
      res.json(data.replace(/(examples:.*?)\|/g, "$1"));
    } else {
      res.json(data.replaceAll(search, replace));
    }
  }
);

router.post(
  "/string-split",
  [
    body("data").isString().withMessage("data must be a string"),
    body("separator").isString().withMessage("separator must be a string")
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data, separator } = matchedData(req);
    res.json(
      data.split(separator).filter(function(n) {
        return n;
      })
    );
  }
);

router.post(
  "/string-to-array",
  [body("data").isString().withMessage("data must be a string")],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data } = matchedData(req);
    if (data.length > 0) {
      const removedQuot = data.replaceAll("&quot;", "");
      const removedHyphens = removedQuot.replace(/^- /gm, "");
      const newArray = removedHyphens.split("\n");
      res.json(newArray.filter((el) => "" !== el.trim()));
    } else {
      res.json([]);
    }
  }
);

router.post("/csv-to-json", (req, res) => {
  if (!req.body.file) {
    return res.status(400).json({ error: "No file uploaded" }).send();
  }
  const fileContent = Object.values(req.body.file)[0];
  const result = Papa.parse(fileContent, { skipEmptyLines: true });
  const csvData = result.data;
  res.json(csvData);
});

router.post(
  "/json-to-yaml-stories",
  [
    body("stories")
      .isArray()
      .optional()
      .withMessage("stories must be an array"),
    body("rules").isArray().optional().withMessage("rules must be an array")
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let result;
    const { stories, rules } = matchedData(req);

    if (stories) {
      result = {
        version: "3.0",
        stories: stories
          .map((entry) => ({
            story: entry.story,
            steps: entry.steps
              .map((step) => {
                const formattedStep = {};
                switch (true) {
                  case !!step.intent:
                    formattedStep.intent = step.intent;
                    if (step.entities && step.entities.length > 0) {
                      formattedStep.entities = step.entities.map((entity) => ({
                        [entity]: ""
                      }));
                    }
                    break;
                  case !!step.action:
                    formattedStep.action = step.action;
                    break;
                  case !!step.slot_was_set &&
                  Object.keys(step.slot_was_set).length > 0:
                    formattedStep.slot_was_set = step.slot_was_set;
                    break;
                  case !!step.condition && step.condition.length > 0:
                    formattedStep.condition = step.condition;
                    break;
                  default:
                    break;
                }
                return formattedStep;
              })
              .filter((step) => Object.keys(step).length > 0)
          }))
          .filter((entry) => entry.steps.length > 0)
      };
    } else if (rules) {
      result = {
        version: "3.0",
        rules: rules
          .map((entry) => ({
            rule: entry.rule,
            ...("conversation_start" in entry && {
              conversation_start: entry.conversation_start
            }),
            ...("wait_for_user_input" in entry && {
              wait_for_user_input: entry.wait_for_user_input
            }),
            steps: entry.steps
              .map((step) => {
                const formattedStep = {};
                switch (true) {
                  case !!step.intent:
                    formattedStep.intent = step.intent;
                    if (step.entities && step.entities.length > 0) {
                      formattedStep.entities = step.entities.map((entity) => ({
                        [entity]: ""
                      }));
                    }
                    break;
                  case !!step.action:
                    formattedStep.action = step.action;
                    break;
                  case !!step.slot_was_set &&
                  Object.keys(step.slot_was_set).length > 0:
                    formattedStep.slot_was_set = step.slot_was_set;
                    break;
                  case !!step.condition && step.condition.length > 0:
                    formattedStep.condition = step.condition;
                    break;
                  default:
                    break;
                }
                return formattedStep;
              })
              .filter((step) => Object.keys(step).length > 0)
          }))
          .filter((entry) => entry.steps.length > 0)
      };
    } else {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const yamlString = stringify(result, {
      customTags: [
        {
          tag: "tag:yaml.org,2002:seq",
          format: "flow",
          test: (value) => value && value.length === 0,
          resolve: () => ""
        }
      ]
    });

    res.json({ json: yamlString });
  }
);

router.post('/chart-data-to-xlsx', [
  body("data")
    .isArray()
    .withMessage("data must be an array of flat objects")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  const headers = Object.keys(req.body.data[0] ?? []);
  const headerRow = worksheet.addRow(headers);
  
  headers.forEach((_, index) => {
    const column = worksheet.getColumn(index + 1);
    // ExcelJS width of 20 is approximately 150px
    column.width = 20;
    headerRow.getCell(index + 1).alignment = { wrapText: true };
  });
  
  req.body.data.forEach(row => {
    worksheet.addRow(headers.map(header => row[header]));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.json({ base64String: buffer.toString('base64') });
});

router.post('/array-to-xlsx', 
  [
    body("data")
      .isArray()
      .withMessage("data must be an array of string arrays")
  ],
  async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    req.body.data.forEach((row) => {
      const processedRow = row.map(cell => {
        if (!isNaN(cell) && cell !== '') {
          return Number(cell);
        }
        return cell;
      });
      worksheet.addRow(processedRow);
    });

    // Calculate and set column widths based on content
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, columnLength);
      });
      worksheet.getColumn(index + 1).width = maxLength;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.json({ base64String: buffer.toString('base64') });
});

router.post('/examples-array-to-xlsx',
  [
    body("data")
      .isArray()
      .withMessage("data must be an array of string arrays")
  ],
  async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    req.body.data.flat().forEach((value) => {
      const processedValue = (!isNaN(value) && value !== '') ? Number(value) : value;
      worksheet.addRow([processedValue]);
    });

    let maxLength = 0;
    worksheet.getColumn(1).eachCell({ includeEmpty: true }, (cell) => {
      const length = cell.value ? cell.value.toString().length : 10;
      maxLength = Math.max(maxLength, length);
    });
    worksheet.getColumn(1).width = maxLength;

    const buffer = await workbook.xlsx.writeBuffer();
    res.json({ base64String: buffer.toString('base64') });
  });


router.post("/xlsx-to-array", async (req, res) => {
  try {
    if (!req.body.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const base64Data = Object.values(req.body.file)[0];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    const jsonData = [];
    
    worksheet.eachRow((row) => {
      // ExcelJS uses 1-based indexing for columns so values[0] is unused.
      jsonData.push(row.values.slice(1));
    });
    
    res.json(jsonData);
  } catch (error) {
    res.status(500).json({ error: "Failed to process Excel file", details: error.message });
  }
});


export default router;
