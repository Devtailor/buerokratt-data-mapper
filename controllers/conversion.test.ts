import ExcelJS from 'exceljs';
import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';

import conversionRouter from './conversion';

vi.mock('yaml', async () => {
  const actual = await vi.importActual<typeof import('yaml')>('yaml');
  return { ...actual, stringify: vi.fn(actual.stringify) };
});

describe('conversion controller', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/conversion', conversionRouter);
  });

  describe('POST /conversion/csv_to_json', () => {
    it('should convert CSV to JSON', async () => {
      const data = { file: Buffer.from('name,age\nJohn,30\n\nJane,25').toString('base64') };
      const res = await request(app).post('/conversion/csv_to_json').send(data);

      expect(res.body).toEqual([
        ['name', 'age'],
        ['John', '30'],
        ['Jane', '25'],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle empty CSV file', async () => {
      const data = { file: Buffer.from('').toString('base64') };
      const res = await request(app).post('/conversion/csv_to_json').send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should reject file exceeding size limit', async () => {
      const data = { file: Buffer.from('a'.repeat(5 * 1024 * 1024)).toString('base64') };
      const res = await request(app).post('/conversion/csv_to_json').send(data);

      expect(res.text).toContain('PayloadTooLargeError');
      expect(res.status).toBe(413);
    });
  });

  describe('POST /conversion/yaml_to_json', () => {
    it('should convert YAML to JSON', async () => {
      const data = {
        file: Buffer.from(
          'name: test\nage: 30\nnested:\n  prop: value\nitems:\n  - item1\n  - item2\n  - item3',
        ).toString('base64'),
      };
      const res = await request(app).post('/conversion/yaml_to_json').send(data);

      expect(res.body).toEqual({
        name: 'test',
        age: 30,
        nested: { prop: 'value' },
        items: ['item1', 'item2', 'item3'],
      });
      expect(res.status).toBe(200);
    });

    it('should handle empty YAML file', async () => {
      const data = { file: Buffer.from('').toString('base64') };
      const res = await request(app).post('/conversion/yaml_to_json').send(data);

      expect(res.body).toEqual(null);
      expect(res.status).toBe(200);
    });

    it('should return 500 when YAML is invalid', async () => {
      const data = { file: Buffer.from('invalid: yaml: [unclosed').toString('base64') };
      const res = await request(app).post('/conversion/yaml_to_json').send(data);

      expect(res.text).toContain('YAMLParseError');
      expect(res.status).toBe(500);
    });

    it('should reject file exceeding size limit', async () => {
      const data = { file: Buffer.from('a'.repeat(5 * 1024 * 1024)).toString('base64') };
      const res = await request(app).post('/conversion/yaml_to_json').send(data);

      expect(res.text).toContain('PayloadTooLargeError');
      expect(res.status).toBe(413);
    });
  });

  describe('POST /conversion/json_to_yaml', () => {
    it('should convert JSON to YAML', async () => {
      const data = { key: 'value', nested: { prop: 'value' } };
      const res = await request(app).post('/conversion/json_to_yaml').send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual(data);
      expect(res.status).toBe(200);
    });

    it('should handle stringify errors', async () => {
      (stringify as any).mockImplementationOnce(() => {
        throw new Error('stringify failed');
      });

      const res = await request(app).post('/conversion/json_to_yaml').send({});

      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });

  describe('POST /conversion/json_to_yaml_domain', () => {
    it('should convert JSON to YAML domain format', async () => {
      const data = {
        name: 'test',
        text: 'text with "quotes" and\nnewlines',
        items: [{ text: 'first item' }, { text: 'second item\nwith newline' }],
        level1: { level2: { text: 'nested text\nwith newline' } },
      };
      const res = await request(app).post('/conversion/json_to_yaml_domain').send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual(data);
      expect(res.status).toBe(200);
    });

    it('should return 500 when conversion fails', async () => {
      const convertJsonToYamlDomainSpy = vi
        .spyOn(await import('../js/convert/index.js'), 'convertJsonToYamlDomain')
        .mockImplementationOnce(() => {
          throw new Error('json to yaml domain conversion failed');
        });

      const data = { text: 'test' };
      const res = await request(app).post('/conversion/json_to_yaml_domain').send(data);

      expect(res.body).toEqual({ error: 'Failed to create file', details: 'json to yaml domain conversion failed' });
      expect(convertJsonToYamlDomainSpy).toHaveBeenCalled();
      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });

  describe('POST /conversion/json_to_yaml_data', () => {
    it('should convert JSON to YAML', async () => {
      const data = { data: { key: 'value', nested: { prop: 'value' } } };
      const res = await request(app).post('/conversion/json_to_yaml_data').send(data);

      const parsed = parse(res.body.yaml as string);

      expect(parsed).toEqual(data.data);
      expect(res.status).toBe(200);
    });

    it('should fallback to default stringify when error occurs', async () => {
      (stringify as any)
        .mockImplementationOnce(() => {
          throw new Error('formatting error');
        })
        .mockImplementationOnce(() => 'fallback-yaml');

      const res = await request(app).post('/conversion/json_to_yaml_data').send({});

      expect(res.body).toEqual({ yaml: 'fallback-yaml' });
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });
  });

  describe('POST /conversion/string-replace', () => {
    it('should replace all occurrences of search string', async () => {
      const data = { data: 'hellohello', search: 'hello', replace: 'hi' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body).toBe('hihi');
      expect(res.status).toBe(200);
    });

    it("should handle special case when search string is '|'", async () => {
      const dataWithoutExamples = { data: 'foo|bar', search: '|', replace: '' };
      const dataWithExamples = { data: 'examples: foo|bar', search: '|', replace: '' };

      const resWithoutExamples = await request(app).post('/conversion/string-replace').send(dataWithoutExamples);
      const resWithExamples = await request(app).post('/conversion/string-replace').send(dataWithExamples);

      expect(resWithoutExamples.body).toBe('foo|bar');
      expect(resWithExamples.body).toBe('examples: foobar');
      expect(resWithoutExamples.status).toBe(200);
      expect(resWithExamples.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = { search: 'hello', replace: 'hi' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not a string', async () => {
      const data = { data: 123, search: 'hello', replace: 'hi' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when search is missing', async () => {
      const data = { data: 'hellohello', replace: 'hi' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when search is not a string', async () => {
      const data = { data: 'hello', search: 123, replace: 'hi' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when replace is missing', async () => {
      const data = { data: 'hellohello', search: 'hello' };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when replace is not a string', async () => {
      const data = { data: 'hellohello', search: 'hello', replace: 123 };
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when body is empty', async () => {
      const data = {};
      const res = await request(app).post('/conversion/string-replace').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/string-split', () => {
    it('should split string by defined separator', async () => {
      const data = { data: 'a,b,,c,', separator: ',' };
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body).toEqual(['a', 'b', 'c']);
      expect(res.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = { separator: ',' };
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not a string', async () => {
      const data = { data: 123, separator: ',' };
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when separator is missing', async () => {
      const data = { data: 'a,b,,c,' };
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when separator is not a string', async () => {
      const data = { data: 'a,b,,c,', separator: 123 };
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when body is empty', async () => {
      const data = {};
      const res = await request(app).post('/conversion/string-split').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/string-to-array', () => {
    it('should convert string to array and remove some special characters', async () => {
      const data = { data: '&quot;item1&quot;\n- item2\n- item3\n\n' };
      const res = await request(app).post('/conversion/string-to-array').send(data);

      expect(res.body).toEqual(['item1', 'item2', 'item3']);
      expect(res.status).toBe(200);
    });

    it('should return empty array when data is an empty string', async () => {
      const data = { data: '' };
      const res = await request(app).post('/conversion/string-to-array').send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/string-to-array').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not a string', async () => {
      const data = { data: 123 };
      const res = await request(app).post('/conversion/string-to-array').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/csv-to-json', () => {
    it('should convert CSV to JSON', async () => {
      const data = { file: { 'test.csv': 'name,age\nJohn,30\nJane,25\nJim,35' } };
      const res = await request(app).post('/conversion/csv-to-json').send(data);

      expect(res.body).toEqual([
        ['name', 'age'],
        ['John', '30'],
        ['Jane', '25'],
        ['Jim', '35'],
      ]);
      expect(res.status).toBe(200);
    });

    it('should return 400 when file is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/csv-to-json').send(data);

      expect(res.body.error).toBe('No file uploaded');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/json-to-yaml-stories', () => {
    it('should convert JSON stories to YAML format', async () => {
      const data = {
        stories: [
          {
            story: 'test_story_multiple_steps',
            steps: [
              { intent: 'greet', entities: ['name'] },
              { action: 'action_hello' },
              { slot_was_set: { slot: 'slot' } },
              { condition: [{ active_loop: 'form' }] },
              {},
            ],
          },
          {
            story: 'test_story_single_step',
            steps: { intent: 'goodbye', entities: ['name'] },
          },
        ],
      };
      const res = await request(app).post('/conversion/json-to-yaml-stories').send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual({
        version: '3.0',
        stories: [
          {
            story: 'test_story_multiple_steps',
            steps: [
              { intent: 'greet', entities: [{ name: '' }] },
              { action: 'action_hello' },
              { slot_was_set: { slot: 'slot' } },
              { condition: [{ active_loop: 'form' }] },
            ],
          },
          {
            story: 'test_story_single_step',
            steps: [{ intent: 'goodbye', entities: [{ name: '' }] }],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it('should convert JSON rules to YAML format', async () => {
      const data = {
        rules: [
          {
            rule: 'test_rule_multiple_steps',
            conversation_start: true,
            wait_for_user_input: false,
            steps: [
              { intent: 'greet', entities: ['name', 'email'] },
              { action: 'action_hello' },
              { slot_was_set: { slot: 'slot' } },
              { condition: [{ active_loop: 'form' }] },
              {},
            ],
          },
          {
            rule: 'test_rule_single_step',
            conversation_start: true,
            steps: { intent: 'goodbye', entities: ['name'] },
          },
        ],
      };
      const res = await request(app).post('/conversion/json-to-yaml-stories').send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual({
        version: '3.0',
        rules: [
          {
            rule: 'test_rule_multiple_steps',
            conversation_start: true,
            wait_for_user_input: false,
            steps: [
              { intent: 'greet', entities: [{ name: '' }, { email: '' }] },
              { action: 'action_hello' },
              { slot_was_set: { slot: 'slot' } },
              { condition: [{ active_loop: 'form' }] },
            ],
          },
          {
            rule: 'test_rule_single_step',
            conversation_start: true,
            steps: [{ intent: 'goodbye', entities: [{ name: '' }] }],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it('should return 400 when stories is not an array', async () => {
      const data = { stories: 'story' };
      const res = await request(app).post('/conversion/json-to-yaml-stories').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when rules is not an array', async () => {
      const data = { rules: 'rule' };
      const res = await request(app).post('/conversion/json-to-yaml-stories').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when neither stories nor rules are provided', async () => {
      const data = {};
      const res = await request(app).post('/conversion/json-to-yaml-stories').send(data);

      expect(res.body.error).toBe('Invalid request body');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/chart-data-to-xlsx', () => {
    it('should convert chart data to Excel', async () => {
      const data = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const res = await request(app).post('/conversion/chart-data-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ['name', 'age'],
        ['John', 30],
        ['Jane', 25],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle empty data array', async () => {
      const data = { data: [] };
      const res = await request(app).post('/conversion/chart-data-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/chart-data-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array', async () => {
      const data = { data: { name: 'John', age: 30 } };
      const res = await request(app).post('/conversion/chart-data-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/array-to-xlsx', () => {
    it('should convert array data to Excel', async () => {
      const data = {
        data: [
          ['name', 'age'],
          ['John', '30'],
          ['Jane', '25'],
          ['', '20'],
        ],
      };
      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ['name', 'age'],
        ['John', 30],
        ['Jane', 25],
        ['', 20],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle columns without eachCell method', async () => {
      const data = {
        data: [
          ['name', 'age'],
          ['John', '30'],
        ],
      };

      const mockWorksheet = {
        addRow: vi.fn(),
        getColumn: vi.fn().mockReturnValue({ width: 0 }),
        columns: [null, { eachCell: 'function' }, { eachCell: (): void => {}, width: 0 }],
      };
      vi.spyOn(ExcelJS.Workbook.prototype, 'addWorksheet').mockReturnValueOnce(
        mockWorksheet as unknown as ExcelJS.Worksheet,
      );

      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      expect(res.body).toHaveProperty('base64String');
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it('should return 400 when data is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array', async () => {
      const data = { data: 'array' };
      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array of arrays', async () => {
      const data = { data: ['array'] };
      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array of string arrays', async () => {
      const data = { data: [[1]] };
      const res = await request(app).post('/conversion/array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/examples-array-to-xlsx', () => {
    it('should convert examples array to Excel', async () => {
      const data = { data: [['', 'abc'], ['123']] };
      const res = await request(app).post('/conversion/examples-array-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([[''], ['abc'], [123]]);
      expect(res.status).toBe(200);
    });

    it('should return 400 when data is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/examples-array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array', async () => {
      const data = { data: 'array' };
      const res = await request(app).post('/conversion/examples-array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array of arrays', async () => {
      const data = { data: ['array'] };
      const res = await request(app).post('/conversion/examples-array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it('should return 400 when data is not an array of string arrays', async () => {
      const data = { data: [[1]] };
      const res = await request(app).post('/conversion/examples-array-to-xlsx').send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /conversion/chats-to-xlsx', () => {
    it('should convert chats to Excel (language = et)', async () => {
      const data = {
        chatMessages: [
          { chatId: '1', content: 'Buerokratt message', authorRole: 'buerokratt', created: '2024-01-01T10:00:00Z' },
          { chatId: '1', content: 'End-user message', authorRole: 'end-user', created: '2024-01-01T10:01:00Z' },
          { chatId: '1', content: 'Other message', authorRole: 'other', created: '2024-01-01T10:02:00Z' },
        ],
        chatHeaders: ['Header1', 'Header2'],
        chatRows: [['Row1', 'Row2']],
        chatIds: ['1'],
      };
      const res = await request(app).post('/conversion/chats-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ['Vestlus #1', '', ''],
        ['Vestluse andmed', '', ''],
        ['Header1', 'Row1', ''],
        ['Header2', 'Row2', ''],
        ['Sõnumid', '', ''],
        ['Loodud', 'Autor', 'Sõnum'],
        ['01.01.2024 12:00:00', 'Bürokratt', 'Buerokratt message'],
        ['01.01.2024 12:01:00', 'Lõppkasutaja', 'End-user message'],
        ['01.01.2024 12:02:00', 'CSA', 'Other message'],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle multiple chats (language = en)', async () => {
      const data = {
        chatMessages: [
          { chatId: '1', content: 'Chat 1 message', authorRole: 'buerokratt', created: '2024-01-01T10:00:00Z' },
          { chatId: '2', content: 'Chat 2 message', authorRole: 'end-user', created: '2024-01-01T13:00:00Z' },
        ],
        chatHeaders: ['Header'],
        chatRows: [['Row1'], ['Row2']],
        chatIds: ['1', '2'],
        language: 'en',
      };
      const res = await request(app).post('/conversion/chats-to-xlsx').send(data);

      const xlsxDataArray = await request(app)
        .post('/conversion/xlsx-to-array')
        .send({ file: { 'test.xlsx': res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ['Chat #1', '', ''],
        ['Chat data', '', ''],
        ['Header', 'Row1', ''],
        ['Messages', '', ''],
        ['Created', 'Author', 'Message'],
        ['01.01.2024 12:00:00', 'Bürokratt', 'Chat 1 message'],
        ['Chat #2', '', ''],
        ['Chat data', '', ''],
        ['Header', 'Row2', ''],
        ['Messages', '', ''],
        ['Created', 'Author', 'Message'],
        ['01.01.2024 15:00:00', 'End-user', 'Chat 2 message'],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle columns without eachCell method', async () => {
      const data = {
        chatMessages: [{ chatId: '1', content: 'TEST', authorRole: 'buerokratt', created: '2024-01-01T10:00:00Z' }],
        chatHeaders: ['Header'],
        chatRows: [['Row1']],
        chatIds: ['1'],
      };

      let rowNumber = 0;
      const mockColumn = { width: 0 };
      const mockCell = { alignment: {}, fill: undefined, font: {} };
      const mockWorksheet = {
        addRow: vi.fn().mockImplementation(() => ({ number: ++rowNumber, height: undefined })),
        getColumn: vi.fn().mockReturnValue(mockColumn),
        getCell: vi.fn().mockReturnValue(mockCell),
      };
      vi.spyOn(ExcelJS.Workbook.prototype, 'addWorksheet').mockReturnValueOnce(
        mockWorksheet as unknown as ExcelJS.Worksheet,
      );
      const mockBuffer = Buffer.from('mock-xlsx');
      vi.spyOn(ExcelJS.Workbook.prototype, 'xlsx', 'get').mockReturnValueOnce({
        writeBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as unknown as ExcelJS.Xlsx);

      const res = await request(app).post('/conversion/chats-to-xlsx').send(data);

      expect(res.body).toHaveProperty('base64String');
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it('should return 500 when processing fails', async () => {
      const data = {};
      const res = await request(app).post('/conversion/chats-to-xlsx').send(data);

      expect(res.body).toEqual({ error: 'Failed to export Excel' });
      expect(res.status).toBe(500);
    });
  });

  describe('POST /conversion/xlsx-to-array', () => {
    it('should convert Excel to array', async () => {
      const xlsxData = {
        data: [
          ['name', 'age'],
          ['John', '30'],
          ['Jane', '25'],
          ['', '20'],
        ],
      };
      const xlsxBase64Data = await request(app).post('/conversion/array-to-xlsx').send(xlsxData);

      const data = { file: { 'test.xlsx': xlsxBase64Data.body.base64String } };
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual([
        ['name', 'age'],
        ['John', 30],
        ['Jane', 25],
        ['', 20],
      ]);
      expect(res.status).toBe(200);
    });

    it('should handle empty Excel file', async () => {
      const xlsxBase64Data = await request(app).post('/conversion/array-to-xlsx').send({ data: [] });

      const data = { file: { 'test.xlsx': xlsxBase64Data.body.base64String } };
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    // edge case (ExcelJS typically returns row.values as an array)
    it('should handle Excel row with non-array values', async () => {
      const xlsxBase64Data = await request(app).post('/conversion/array-to-xlsx').send({ data: [] });

      const getWorksheetSpy = vi.spyOn(ExcelJS.Workbook.prototype, 'getWorksheet').mockReturnValueOnce({
        eachRow: (callback: any) => {
          callback({ values: 'value' }, 1);
        },
      } as unknown as ExcelJS.Worksheet);

      const data = { file: { 'test.xlsx': xlsxBase64Data.body.base64String } };
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual([[]]);
      expect(getWorksheetSpy).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it('should return 400 when worksheet is not found', async () => {
      const workbook = new ExcelJS.Workbook();

      const buffer = await workbook.xlsx.writeBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');

      const data = { file: { 'test.xlsx': base64Data } };
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual({ error: 'Worksheet not found in Excel file' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when file is missing', async () => {
      const data = {};
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual({ error: 'No file uploaded' });
      expect(res.status).toBe(400);
    });

    it('should return 500 when processing fails', async () => {
      const data = { file: { 'test.xlsx': 'invalid-base64-data' } };
      const res = await request(app).post('/conversion/xlsx-to-array').send(data);

      expect(res.body).toEqual(expect.objectContaining({ error: 'Failed to process Excel file' }));
      expect(res.status).toBe(500);
    });
  });
});
