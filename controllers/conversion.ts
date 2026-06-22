import fs from 'fs/promises';
import path from 'path';

import ExcelJS from 'exceljs';
import express, { Request, RequestHandler, Response } from 'express';
import { body, matchedData, validationResult } from 'express-validator';
import multer from 'multer';
import Papa from 'papaparse';
import { parse, stringify } from 'yaml';

import { ChatMessage, ChatsToXlsxBody, Rule, RuleStoryStep, Story } from '../interfaces';
import { convertJsonToYamlDomain } from '../js/convert';
import { base64ToText, buildChatExportPaths } from '../js/util';

const router = express.Router();

// Common file size limit constant (5MB)
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;
const CONTENT_FOLDER = process.env.CONTENT_FOLDER || 'data';
const CHAT_EXPORTS_RELATIVE_DIR = 'chat-exports';
const CHAT_EXPORTS_DIR = path.join(CONTENT_FOLDER, CHAT_EXPORTS_RELATIVE_DIR);

function resolveChatExportUnlinkPath(filePath: string): string | null {
  if (path.isAbsolute(filePath)) {
    return null;
  }

  const normalizedFilePath = path.normalize(filePath.replace(/\\/g, path.sep));
  const chatExportsPrefix = `${CHAT_EXPORTS_RELATIVE_DIR}${path.sep}`;

  if (
    !normalizedFilePath.startsWith(chatExportsPrefix) ||
    !path.basename(normalizedFilePath).startsWith('chat-history-') ||
    path.extname(normalizedFilePath).toLowerCase() !== '.xlsx'
  ) {
    return null;
  }

  return path.join(CONTENT_FOLDER, normalizedFilePath);
}

router.post(
  '/csv_to_json',
  multer({ limits: { fileSize: FILE_SIZE_LIMIT } }).array('file') as RequestHandler,
  (req: Request<{}, {}, { file: string }>, res: Response) => {
    const file = base64ToText(req.body.file);
    const result = Papa.parse(file, { skipEmptyLines: true });
    res.json(result.data);
  },
);

router.post(
  '/yaml_to_json',
  multer({ limits: { fileSize: FILE_SIZE_LIMIT } }).array('file') as RequestHandler,
  (req: Request<{}, {}, { file: string }>, res: Response) => {
    const file = base64ToText(req.body.file);
    const result = parse(file);
    res.json(result);
  },
);

router.post('/json_to_yaml', (req: Request, res: Response) => {
  const result = stringify(req.body, { lineWidth: 0 });
  res.send({ json: result });
});

router.post('/json_to_yaml_domain', (req: Request, res: Response) => {
  try {
    const convertedYaml = convertJsonToYamlDomain(req.body);
    res.send({ json: convertedYaml });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create file', details: error.message });
  }
});

router.post('/json_to_yaml_data', (req: Request, res: Response) => {
  try {
    let result = stringify(req.body.data, { lineWidth: -1 });
    result = result.replaceAll(/(\n[^\s].+?:)/g, '\n$1');
    result = result.trimStart();
    res.send({ yaml: result });
  } catch (error: any) {
    console.error('Error formatting yaml lines', error);
    const result = stringify(req.body.data);
    res.send({ yaml: result });
  }
});

router.post('/json_to_yaml_data_multiple', (req: Request, res: Response) => {
  try {
    const { data: dataArray } = req.body;
    const results = dataArray.map((item: any) => {
      try {
        let result = stringify(item, { lineWidth: -1 });
        result = result.replaceAll(/(\n[^\s].+?:)/g, '\n$1');
        result = result.trimStart();
        return result;
      } catch (error) {
        console.error('Error formatting yaml for item', error);
        return stringify(item);
      }
    });
    res.send({ yamls: results });
  } catch (error: any) {
    console.error('Error processing yaml conversion', error);
    res.status(500).send({
      error: 'Failed to process yaml conversion',
      details: error.message,
    });
  }
});

router.post(
  '/string-replace',
  [
    body('data').isString().withMessage('data must be a string'),
    body('search').isString().withMessage('search must be a string'),
    body('replace').isString().withMessage('replace must be a string'),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data, search, replace } = matchedData(req) as { data: string; search: string; replace: string };
    if (search === '|') {
      res.json(data.replace(/(examples:.*?)\|/g, '$1'));
    } else {
      res.json(data.replaceAll(search, replace));
    }
  },
);

router.post(
  '/string-split',
  [
    body('data').isString().withMessage('data must be a string'),
    body('separator').isString().withMessage('separator must be a string'),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data, separator } = matchedData(req) as { data: string; separator: string };
    res.json(
      data.split(separator).filter(function (n) {
        return n;
      }),
    );
  },
);

router.post(
  '/string-to-array',
  [body('data').isString().withMessage('data must be a string')],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { data } = matchedData(req) as { data: string };
    if (data.length > 0) {
      const removedQuot = data.replaceAll('&quot;', '');
      const removedHyphens = removedQuot.replace(/^- /gm, '');
      const newArray = removedHyphens.split('\n');
      res.json(newArray.filter((el) => '' !== el.trim()));
    } else {
      res.json([]);
    }
  },
);

router.post('/csv-to-json', (req: Request<{}, {}, { file: Record<string, string> }>, res: Response) => {
  if (!req.body.file) {
    return res.status(400).json({ error: 'No file uploaded' }).send();
  }
  const fileContent = Object.values(req.body.file)[0];
  const result = Papa.parse(fileContent, { skipEmptyLines: true });
  const csvData = result.data;
  res.json(csvData);
});

router.post(
  '/json-to-yaml-stories',
  [
    body('stories').isArray().optional().withMessage('stories must be an array'),
    body('rules').isArray().optional().withMessage('rules must be an array'),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let result: any;
    const { stories, rules } = matchedData(req) as { stories?: any[]; rules?: any[] };

    if (stories) {
      result = {
        version: '3.0',
        stories: stories
          .map((entry: Story) => {
            const stepsArray = Array.isArray(entry.steps) ? entry.steps : [entry.steps];

            return {
              story: entry.story,
              steps: stepsArray
                .map((step: RuleStoryStep) => {
                  const formattedStep: RuleStoryStep = {};
                  switch (true) {
                    case !!step.intent:
                      formattedStep.intent = step.intent;
                      if (step.entities && step.entities.length > 0) {
                        formattedStep.entities = step.entities.map((entity: any) => ({
                          [entity]: '',
                        }));
                      }
                      break;
                    case !!step.action:
                      formattedStep.action = step.action;
                      break;
                    case !!step.slot_was_set && Object.keys(step.slot_was_set).length > 0:
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
                .filter((step: RuleStoryStep) => Object.keys(step).length > 0),
            };
          })
          .filter((entry: any) => entry.steps.length > 0),
      };
    } else if (rules) {
      result = {
        version: '3.0',
        rules: rules
          .map((entry: Rule) => {
            const stepsArray = Array.isArray(entry.steps) ? entry.steps : [entry.steps];

            return {
              rule: entry.rule,
              ...(entry.conversation_start !== undefined && {
                conversation_start: entry.conversation_start,
              }),
              ...(entry.wait_for_user_input !== undefined && {
                wait_for_user_input: entry.wait_for_user_input,
              }),
              steps: stepsArray
                .map((step: RuleStoryStep) => {
                  const formattedStep: RuleStoryStep = {};
                  switch (true) {
                    case !!step.intent:
                      formattedStep.intent = step.intent;
                      if (step.entities && step.entities.length > 0) {
                        formattedStep.entities = step.entities.map((entity: any) => ({
                          [entity]: '',
                        }));
                      }
                      break;
                    case !!step.action:
                      formattedStep.action = step.action;
                      break;
                    case !!step.slot_was_set && Object.keys(step.slot_was_set).length > 0:
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
                .filter((step: RuleStoryStep) => Object.keys(step).length > 0),
            };
          })
          .filter((entry: any) => entry.steps.length > 0),
      };
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const yamlString = stringify(result, {
      customTags: [
        {
          tag: 'tag:yaml.org,2002:seq',
          format: 'flow',
          identify: (value: unknown): boolean => Array.isArray(value) && value.length === 0,
          resolve: (): any => '',
        },
      ],
    });

    res.json({ json: yamlString });
  },
);

router.post(
  '/chart-data-to-xlsx',
  [body('data').isArray().withMessage('data must be an array of flat objects')],
  async (req: Request<{}, {}, { data: Record<string, any>[] }>, res: Response) => {
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

    req.body.data.forEach((row: any) => {
      worksheet.addRow(headers.map((header) => row[header]));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.json({ base64String: Buffer.from(buffer).toString('base64') });
  },
);

router.post(
  '/array-to-xlsx',
  [
    body('data')
      .isArray()
      .custom((array: any[]) => {
        return array.every((item) => {
          if (!Array.isArray(item)) return false;
          return item.every((value) => typeof value === 'string');
        });
      })
      .withMessage('data must be an array of string arrays'),
  ],
  async (req: Request<{}, {}, { data: string[][] }>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    req.body.data.forEach((row) => {
      // eslint-disable-next-line sonarjs/function-return-type
      const processedRow = row.map<string | number>((cell) => {
        const numeric = Number(cell);
        return cell !== '' && !Number.isNaN(numeric) ? numeric : cell;
      });
      worksheet.addRow(processedRow);
    });

    // Calculate and set column widths based on content
    if (worksheet.columns) {
      worksheet.columns.forEach((column, index) => {
        if (!column || typeof column.eachCell !== 'function') return;

        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          maxLength = Math.max(maxLength, columnLength);
        });
        worksheet.getColumn(index + 1).width = maxLength;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.json({ base64String: Buffer.from(buffer).toString('base64') });
  },
);

router.post(
  '/examples-array-to-xlsx',
  [
    body('data')
      .isArray()
      .custom((array: any[]) => {
        return array.every((item) => {
          if (!Array.isArray(item)) return false;
          return item.every((value) => typeof value === 'string');
        });
      })
      .withMessage('data must be an array of string arrays'),
  ],
  async (req: Request<{}, {}, { data: string[][] }>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    req.body.data.flat().forEach((value) => {
      const numeric = Number(value);
      const processedValue = value !== '' && !Number.isNaN(numeric) ? numeric : value;
      worksheet.addRow([processedValue]);
    });

    if (worksheet.columns) {
      let maxLength = 0;
      worksheet.getColumn(1).eachCell({ includeEmpty: true }, (cell) => {
        const length = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, length);
      });
      worksheet.getColumn(1).width = maxLength;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.json({ base64String: Buffer.from(buffer).toString('base64') });
  },
);

function applyCellStyle(
  cell: ExcelJS.Cell,
  opts: { fill?: ExcelJS.Fill; bold?: boolean; font?: { color?: { argb: string } } } = {},
): void {
  cell.alignment = {
    wrapText: true,
    vertical: 'bottom' as const,
    horizontal: 'left' as const,
  };
  if (opts.fill) cell.fill = opts.fill;
  if (opts.bold) cell.font = { ...cell.font, bold: true };
  if (opts.font?.color) cell.font = { ...cell.font, color: opts.font.color };
}

type RowValue = string | number | null;

function formatDateCell(val: string | number | Date, dateLocale: string): string {
  return new Date(val)
    .toLocaleString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Tallinn',
    })
    .replaceAll('/', '.')
    .replaceAll(',', '');
}

function getCsaFullName(chatRow: Record<string, any>): string {
  const allCsa: string[] = chatRow.allCsa ?? [];
  const cleaned = allCsa.filter((n) => !!n && typeof n === 'string' && n.trim() !== '');
  const filtered = cleaned.length > 1 ? cleaned.filter((n) => n !== 'Bürokratt') : cleaned;
  return filtered.join(', ') || 'Bürokratt';
}

function getFeedbackRating(chatRow: Record<string, any>): string {
  const val = chatRow.feedbackRating;
  if (val == null) return '';
  const max = chatRow.isFiveRatingScale === 'true' ? 5 : 10;
  return `${val}/${max}`;
}

function getContactsMessage(val: unknown, language: string): string {
  if (val) return language === 'en' ? 'Yes' : 'Jah';
  return language === 'en' ? 'No' : 'Ei';
}

function extractRowValues(
  chatRow: Record<string, any>,
  columnIds: string[],
  language: string,
  dateLocale: string,
): RowValue[] {
  return columnIds.map((colId) => {
    switch (colId) {
      case 'created':
      case 'ended': {
        const val = chatRow[colId];
        if (!val) return '';
        return formatDateCell(val as string | number | Date, dateLocale);
      }
      case 'endUserName':
        return `${chatRow.endUserFirstName ?? ''} ${chatRow.endUserLastName ?? ''}`.trim();
      case 'customerSupportFullName':
        return getCsaFullName(chatRow);
      case 'feedbackRating':
        return getFeedbackRating(chatRow);
      case 'contactsMessage':
        return getContactsMessage(chatRow.contactsMessage, language);
      case 'status':
        return chatRow.lastMessageEvent ?? '';
      case 'www':
        return chatRow.endUserUrl ?? '';
      default: {
        const val = chatRow[colId];
        if (val == null) return '';
        return typeof val === 'object' ? JSON.stringify(val) : val;
      }
    }
  });
}

router.post('/chats-to-xlsx', async (req: Request<{}, {}, ChatsToXlsxBody>, res: Response) => {
  try {
    const { chatMessages, chatHeaders, chatRows, chatIds, chatColumnIds, language = 'et' } = req.body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Chats');
    const MIN_ROW_HEIGHT = 16;
    const POINTS_PER_LINE = 14;
    const minHeightForWrappedText = (text: string, colWidthChars: number): number =>
      Math.max(MIN_ROW_HEIGHT, (Math.ceil(((text ?? '').length || 1) / colWidthChars) || 1) * POINTS_PER_LINE);
    const dateLocale = language === 'en' ? 'en-GB' : 'et-EE';
    const createdLabel = language === 'en' ? 'Created' : 'Loodud';
    const authorLabel = language === 'en' ? 'Author' : 'Autor';
    const messageLabel = language === 'en' ? 'Message' : 'Sõnum';
    const chatNumberLabel = (n: number): string => (language === 'en' ? `Chat #${n}` : `Vestlus #${n}`);
    const chatDataSectionLabel = language === 'en' ? 'Chat data' : 'Vestluse andmed';
    const messagesSectionLabel = language === 'en' ? 'Messages' : 'Sõnumid';

    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 100;

    chatIds.forEach((chatId: string, index: number) => {
      const rawRow = (chatRows as any[])[index] ?? [];
      const chatRowValues: (string | number | null)[] =
        chatColumnIds && !Array.isArray(rawRow)
          ? extractRowValues(rawRow as Record<string, any>, chatColumnIds, language, dateLocale)
          : (rawRow as (string | number | null)[]);
      const chatNumber = index + 1;

      const startRow = worksheet.addRow([chatNumberLabel(chatNumber), '', '']);
      startRow.height = MIN_ROW_HEIGHT;
      [1, 2, 3].forEach((col) => {
        applyCellStyle(worksheet.getCell(startRow.number, col), {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '2F6EBA' },
          },
          bold: true,
          font: { color: { argb: 'FFFFFFFF' } },
        });
      });

      const chatDataSectionRow = worksheet.addRow([chatDataSectionLabel, '', '']);
      chatDataSectionRow.height = MIN_ROW_HEIGHT;
      [1, 2, 3].forEach((col) => {
        applyCellStyle(worksheet.getCell(chatDataSectionRow.number, col), {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D9D9D9' },
          },
        });
      });

      chatHeaders.forEach((key, i) => {
        const value = chatRowValues[i] ?? '';
        const row = worksheet.addRow([key, value, '']);
        row.height = minHeightForWrappedText(String(value), 30);
        [1, 2, 3].forEach((col) => applyCellStyle(worksheet.getCell(row.number, col)));
      });

      const messagesSectionRow = worksheet.addRow([messagesSectionLabel, '', '']);
      messagesSectionRow.height = MIN_ROW_HEIGHT;
      [1, 2, 3].forEach((col) => {
        applyCellStyle(worksheet.getCell(messagesSectionRow.number, col), {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D9D9D9' },
          },
        });
      });

      const messagesHeaderRow = worksheet.addRow([createdLabel, authorLabel, messageLabel]);
      messagesHeaderRow.height = MIN_ROW_HEIGHT;
      [1, 2, 3].forEach((col) => applyCellStyle(worksheet.getCell(messagesHeaderRow.number, col)));

      const relatedMessages = chatMessages
        .filter((msg: ChatMessage) => msg.chatId === chatId)
        .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

      relatedMessages.forEach((msg: ChatMessage) => {
        const formattedDateTime = new Date(msg.created)
          .toLocaleString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Europe/Tallinn',
          })
          .replaceAll('/', '.')
          .replaceAll(',', '');
        let author: string;
        if (msg.authorRole === 'buerokratt') author = 'Bürokratt';
        else if (msg.authorRole === 'end-user') author = language === 'en' ? 'End-user' : 'Lõppkasutaja';
        else author = 'CSA';
        const row = worksheet.addRow([formattedDateTime, author, msg.content]);
        const isEndUser = msg.authorRole === 'end-user';
        [1, 2, 3].forEach((col) => {
          applyCellStyle(worksheet.getCell(row.number, col), {
            fill: isEndUser
              ? undefined
              : {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFDDEBF7' },
                },
          });
        });
      });
      worksheet.addRow([]);
    });

    await fs.mkdir(CHAT_EXPORTS_DIR, { recursive: true });
    const { absoluteFsPath, relativeFilePath } = buildChatExportPaths(CHAT_EXPORTS_DIR);
    await workbook.xlsx.writeFile(absoluteFsPath);

    res.json({ filePath: relativeFilePath });
  } catch (err: any) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

router.post('/chats-to-xlsx/unlink', async (req: Request<{}, {}, { readonly filePath: string }>, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const unlinkPath = resolveChatExportUnlinkPath(filePath);
    if (!unlinkPath) {
      return res.status(400).json({ error: 'Only chats-to-xlsx exports can be unlinked' });
    }

    await fs.unlink(unlinkPath);

    res.status(200).send({ isUnlinked: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }

    console.error('File unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink file' });
  }
});

router.post('/xlsx-to-array', async (req: Request<{}, {}, { file: Record<string, string> }>, res: Response) => {
  try {
    if (!req.body.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const base64Data = Object.values(req.body.file)[0];
    const buffer = Uint8Array.from(Buffer.from(base64Data, 'base64')).buffer;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    const jsonData: any[] = [];

    if (worksheet) {
      worksheet.eachRow((row) => {
        // ExcelJS uses 1-based indexing for columns so values[0] is unused.
        if (Array.isArray(row.values)) {
          jsonData.push(row.values.slice(1));
        } else {
          jsonData.push([]);
        }
      });
      res.json(jsonData);
    } else {
      res.status(400).json({ error: 'Worksheet not found in Excel file' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process Excel file', details: error.message });
  }
});

router.post('/json_to_yaml_quoted', (req: Request, res: Response) => {
  const { keys = [], ...data } = req.body;
  let result = stringify(data, { lineWidth: 0 });

  if (keys.length > 0) {
    result = result
      .split('\n')
      .map((line: string) => {
        const trimmedLine = line.trim();
        const matchedKey = (keys as string[]).find(
          (key) => trimmedLine.startsWith(`${key}:`) || trimmedLine.startsWith(`- ${key}:`),
        );
        if (!matchedKey) return line;

        const index = line.indexOf(':');
        const prefix = line.substring(0, index);
        const value = line.substring(index + 1).trim();

        if (value.startsWith("'") && value.endsWith("'")) {
          return `${prefix}: "${value.slice(1, -1).replace(/"/g, '\\"')}"`;
        }
        if (!value.startsWith('"') || !value.endsWith('"')) {
          return `${prefix}: "${value.replace(/"/g, '\\"')}"`;
        }
        return line;
      })
      .join('\n');
  }

  res.send({ json: result });
});

export default router;
