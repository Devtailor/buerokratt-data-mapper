import { createHash } from 'crypto';

import bodyParser from 'body-parser';
import express from 'express';
import { body, matchedData, validationResult } from 'express-validator';

import { compareIntents, extractIntentsFromModelReport, getIntentsFromRuleSteps } from '../js/util/utils.js';

const router = express.Router();

router.post(
  '/increase-double-digit-version',
  [body('version').isString().withMessage('version must be a string')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { version } = matchedData(req);
    const splitVersion = version.split('_');
    const majorV = splitVersion[0];
    let minorV = parseInt(splitVersion[1]);
    minorV += 1;
    res.json(`${majorV}_${minorV}`);
  },
);

router.post('/object-list-contains-id', async (req, res) => {
  const { id, list } = req.body;
  const exists = checkIdExists(list, id);
  res.json(exists);
});

router.post('/today-minus-days', async (req, res) => {
  const result = new Date();
  result.setDate(result.getDate() - req.body.days);
  return res.json({ data: result });
});

router.post('/calculate-sha256-checksum', bodyParser.text({ type: 'text/plain' }), async (req, res) => {
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json('error: request body is empty');
  }
  const hash = createHash('sha256');
  hash.update(req.body);
  res.send(hash.digest('hex'));
});

function checkIdExists(array, id) {
  for (const element of array) {
    if (element.id === id) return true;
  }
  return false;
}

router.post('/map-domains-data', async (req, res) => {
  const { domains, userDomains } = req.body;

  const result = domains
    .filter((domain) => userDomains.domains.includes(domain.domainId))
    .map((domain) => ({
      id: domain.domainId,
      name: domain.name,
      url: domain.url,
      selected: userDomains.selected.includes(domain.domainId),
    }));

  return res.json(result);
});

router.post('/compare-model-intent-reports', async (req, res) => {
  try {
    const { oldModelReport, newModelReport } = req.body;

    if (!oldModelReport || !newModelReport) {
      return res.status(400).json({
        error: 'Both oldModelReport and newModelReport are required',
      });
    }

    if (
      typeof oldModelReport !== 'object' ||
      typeof newModelReport !== 'object' ||
      Array.isArray(oldModelReport) ||
      Array.isArray(newModelReport)
    ) {
      return res.status(400).json({
        error: 'Both oldModelReport and newModelReport must be objects',
      });
    }

    const oldIntents = extractIntentsFromModelReport(oldModelReport);
    const newIntents = extractIntentsFromModelReport(newModelReport);

    const result = compareIntents(oldIntents, newIntents);
    return res.json(result);
  } catch (error) {
    console.error('Error comparing model intents:', error);
    return res.status(500).json({
      error: 'Internal server error while comparing model intents',
    });
  }
});

router.post('/get-intents-from-rule-steps', async (req, res) => {
  try {
    const { steps } = req.body;

    if (steps === undefined || steps === null) {
      return res.status(400).json({
        error: 'steps parameter is required',
      });
    }

    if (!Array.isArray(steps) && typeof steps !== 'object') {
      return res.status(400).json({
        error: 'steps must be either an array or an object',
      });
    }

    const intents = getIntentsFromRuleSteps(steps);
    return res.json(intents);
  } catch (error) {
    console.error('Error extracting intents from rule steps:', error);
    return res.status(500).json({
      error: 'Internal server error while extracting intents',
    });
  }
});

export default router;
