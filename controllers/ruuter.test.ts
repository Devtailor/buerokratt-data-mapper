import fs from 'fs';
import path from 'path';

import express, { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import ruuterRouter, { type ServiceMap } from './ruuter';

describe('ruuter controller', () => {
  let app: Express;

  const tempDir = path.join(__dirname, 'test-ruuter-dir');
  const ruuterDir = path.join(tempDir, 'Ruuter');

  const setupDirectories = (): void => {
    process.env.CONTENT_FOLDER = tempDir;

    fs.mkdirSync(path.join(ruuterDir, 'POST', 'active'), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, 'POST', 'inactive'), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, 'GET', 'active'), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, 'GET', 'inactive'), { recursive: true });

    fs.mkdirSync(path.join(ruuterDir, 'POST', 'sticky', 'active'), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, 'POST', 'sticky', 'inactive'), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, 'GET', 'sticky', 'active'), { recursive: true });
  };

  const cleanup = (): void => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/ruuter', ruuterRouter);
  });

  beforeEach(() => {
    cleanup();
    setupDirectories();
  });

  afterEach(() => {
    cleanup();
    delete process.env.CONTENT_FOLDER;
  });

  describe('GET /ruuter/list', () => {
    it('should return list of all services', async () => {
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'active', 'postActiveService.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(
        path.join(ruuterDir, 'POST', 'inactive', 'postInactiveService.yml'),
        stringify({ test: 'data' }),
      );
      fs.writeFileSync(path.join(ruuterDir, 'GET', 'active', 'getActiveService.yml'), stringify({ test: 'data' }));

      const res = await request(app).get('/ruuter/list');

      expect(res.body).toHaveLength(3);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'postActiveService', type: 'POST', status: 'active' }),
          expect.objectContaining({ name: 'postInactiveService', type: 'POST', status: 'inactive' }),
          expect.objectContaining({ name: 'getActiveService', type: 'GET', status: 'active' }),
        ]),
      );
      expect(res.status).toBe(200);
    });

    it('should return list where only yml files are included', async () => {
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'active', 'service.txt'), 'test');
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'active', 'service.yml'), stringify({ test: 'data' }));

      const res = await request(app).get('/ruuter/list');

      expect(res.body).toHaveLength(1);
      expect(res.body).toEqual([expect.objectContaining({ name: 'service', type: 'POST', status: 'active' })]);
      expect(res.status).toBe(200);
    });

    it('should return empty array when no services exist', async () => {
      const res = await request(app).get('/ruuter/list');

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /ruuter/sticky', () => {
    it('should return map of sticky services', async () => {
      fs.writeFileSync(
        path.join(ruuterDir, 'POST', 'sticky', 'active', 'postStickyActiveService.yml'),
        stringify({ test: 'data' }),
      );
      fs.writeFileSync(
        path.join(ruuterDir, 'POST', 'sticky', 'inactive', 'postStickyInactiveService.yml'),
        stringify({ test: 'data' }),
      );
      fs.writeFileSync(
        path.join(ruuterDir, 'GET', 'sticky', 'active', 'getStickyActiveService.yml'),
        stringify({ test: 'data' }),
      );

      const res = await request(app).get('/ruuter/sticky');

      expect(Object.keys(res.body as ServiceMap).length).toBe(3);
      expect(res.body).toEqual({
        postStickyActiveService: { type: 'POST', status: 'active' },
        postStickyInactiveService: { type: 'POST', status: 'inactive' },
        getStickyActiveService: { type: 'GET', status: 'active' },
      });
      expect(res.status).toBe(200);
    });

    it('should filter out non-sticky services and non-yml files', async () => {
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'active', 'regular.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'active', 'sticky-name.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'sticky', 'active', 'sticky.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'sticky', 'active', 'sticky.txt'), 'test');

      const res = await request(app).get('/ruuter/sticky');

      expect(Object.keys(res.body as ServiceMap).length).toBe(1);
      expect(res.body).toEqual({ sticky: { type: 'POST', status: 'active' } });
      expect(res.status).toBe(200);
    });

    it('should group multiple (3 or more) sticky services with same name into array', async () => {
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'sticky', 'active', 'service.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'sticky', 'inactive', 'service.yml'), stringify({ test: 'data' }));
      fs.writeFileSync(path.join(ruuterDir, 'GET', 'sticky', 'active', 'service.yml'), stringify({ test: 'data' }));

      const res = await request(app).get('/ruuter/sticky');

      expect(Object.keys(res.body as ServiceMap).length).toBe(1);
      expect(res.body).toEqual({
        service: expect.arrayContaining([
          { type: 'POST', status: 'active' },
          { type: 'POST', status: 'inactive' },
          { type: 'GET', status: 'active' },
        ]),
      });
      expect(res.status).toBe(200);
    });

    it('should return empty map when no sticky services exist', async () => {
      const res = await request(app).get('/ruuter/sticky');

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });
  });

  describe('POST /ruuter/sticky/steps', () => {
    it('should return sticky service YAML as JSON', async () => {
      const yamlContent = { steps: [{ step: 'test' }] };
      fs.writeFileSync(path.join(ruuterDir, 'POST', 'sticky', 'active', 'service.yml'), stringify(yamlContent));

      const res = await request(app).post('/ruuter/sticky/steps').send({ name: 'service' });

      expect(res.body).toEqual(yamlContent);
      expect(res.status).toBe(200);
    });

    it('should return 404 when sticky service not found', async () => {
      const res = await request(app).post('/ruuter/sticky/steps').send({ name: 'nonexistent' });

      expect(res.body.message).toBe('Sticky DSL not found');
      expect(res.status).toBe(404);
    });

    it('should return 500 when YAML parsing fails', async () => {
      fs.writeFileSync(
        path.join(ruuterDir, 'POST', 'sticky', 'active', 'service.yml'),
        'invalid: yaml: content: [unclosed',
      );

      const res = await request(app).post('/ruuter/sticky/steps').send({ name: 'service' });

      expect(res.body.message).toBe("Can't read the file");
      expect(res.status).toBe(500);
    });
  });
});
