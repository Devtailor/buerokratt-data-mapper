import { createHash } from 'crypto';

import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { body, matchedData, validationResult } from 'express-validator';

const router = express.Router();

type VersionRequest = { version: string };

type ObjectListContainsIdRequest = { id: string; list: { id: string }[] };

type TodayMinusDaysRequest = { days: number };

type MapDomainsDataRequest = {
  domains: { domainId: string; name: string; url: string }[];
  userDomains: { domains: string[]; selected: string[] };
};

router.post(
  '/increase-double-digit-version',
  [body('version').isString().withMessage('version must be a string')],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { version } = matchedData(req) as VersionRequest;
    const splitVersion = version.split('_');
    const majorV = splitVersion[0];
    let minorV = parseInt(splitVersion[1]);
    minorV += 1;
    res.json(`${majorV}_${minorV}`);
  },
);

router.post('/object-list-contains-id', (req: Request, res: Response) => {
  const { id, list } = req.body as ObjectListContainsIdRequest;
  const exists = checkIdExists(list, id);
  res.json(exists);
});

router.post('/today-minus-days', (req: Request, res: Response) => {
  const { days } = req.body as TodayMinusDaysRequest;
  const result = new Date();
  result.setDate(result.getDate() - days);
  return res.json({ data: result });
});

router.post('/calculate-sha256-checksum', bodyParser.text({ type: 'text/plain' }), (req: Request, res: Response) => {
  const bodyText = typeof req.body === 'string' ? req.body : '';
  if (!bodyText || bodyText.length === 0) {
    return res.status(400).json('error: request body is empty');
  }
  const hash = createHash('sha256');
  hash.update(bodyText);
  res.send(hash.digest('hex'));
});

function checkIdExists(array: { id: string }[], id: string): boolean {
  for (const element of array) {
    if (element.id === id) return true;
  }
  return false;
}

router.post('/map-domains-data', (req: Request, res: Response) => {
  const { domains, userDomains } = req.body as MapDomainsDataRequest;

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

export default router;
