import { describe, expect, it } from 'vitest';

import * as helpers from './helpers';

describe('helpers', () => {
  it('stringToList returns formatted string', () => {
    const result = helpers.stringToList('a,b', { fn: ({ value }) => value });
    expect(result).toBe('"a","b"');
  });

  it('lookupConfigs finds config value', () => {
    const arr = [{ key: 'foo', value: 'bar' }];
    expect(helpers.lookupConfigs(arr, 'foo')).toBe('bar');
    expect(helpers.lookupConfigs(arr, 'baz')).toBe('');
  });

  it('calculateDateDifference returns correct values', () => {
    const base = { startDate: '2020-01-01', endDate: '2021-01-01' };
    expect(helpers.calculateDateDifference(base)).toBeGreaterThan(360);
    expect(helpers.calculateDateDifference({ ...base, outputType: 'years' })).toBe(1);
    expect(helpers.calculateDateDifference({ ...base, outputType: 'months' })).toBe(12);
    expect(helpers.calculateDateDifference({ ...base, outputType: 'hours' })).toBeGreaterThan(8000);
    expect(helpers.calculateDateDifference({ ...base, outputType: 'minutes' })).toBeGreaterThan(500000);
    expect(helpers.calculateDateDifference({ ...base, outputType: 'seconds' })).toBeGreaterThan(30000000);
  });

  it('extractSlotKeys returns keys', () => {
    expect(helpers.extractSlotKeys({ a: 1, b: 2 })).toEqual(['a', 'b']);
  });

  it('snakeToString returns unchanged non-string values and formats snake_case strings', () => {
    expect(helpers.snakeToString(undefined)).toBe(undefined);
    expect(helpers.snakeToString(null)).toBe(null);
    expect(helpers.snakeToString(123)).toBe(123);
    expect(helpers.snakeToString('foo_bar')).toBe('"Foo bar"');
  });

  it('removeEntityFromArray removes entity', () => {
    const arr = [1, 2, 3];
    expect(helpers.removeEntityFromArray(arr, 2)).toEqual([1, 3]);
  });

  it('sortEntities sorts by name', () => {
    const arr = [{ name: 'b' }, { name: 'a' }];
    expect(helpers.sortEntities(arr)).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('isInModel checks intent', () => {
    expect(helpers.isInModel('foo', { inmodel: ['foo'] })).toBe(true);
    expect(helpers.isInModel('bar', { inmodel: ['foo'] })).toBe(false);
  });

  it('findConnectedServiceId finds service', () => {
    expect(helpers.findConnectedServiceId('foo_bar', { connections: [{ intent: 'foo bar', service: 'svc' }] })).toBe(
      'svc',
    );
    expect(helpers.findConnectedServiceId('baz', { connections: [{ intent: 'foo bar', service: 'svc' }] })).toBe('');
  });

  it('findModifiedAt finds created date', () => {
    expect(helpers.findModifiedAt('foo', [{ intent: 'foo', created: '2020' }])).toBe('2020');
    expect(helpers.findModifiedAt('bar', [{ intent: 'foo', created: '2020' }])).toBeUndefined();
  });

  it('getCount returns correct count', () => {
    expect(helpers.getCount('foo', { count: [{ key: 'foo', examples_counts: { value: 5 } }] })).toBe(5);
    expect(helpers.getCount('bar', { count: [{ key: 'foo', examples_counts: { value: 5 } }] })).toBe(0);
  });

  it('addStringIfAbsent and concatStringIfAbsent', () => {
    expect(helpers.addStringIfAbsent('bar', 'foo')).toBe('foobar');
    expect(helpers.addStringIfAbsent('foobar', 'foo')).toBe('foobar');
    expect(helpers.concatStringIfAbsent('foo', 'bar')).toBe('foobar');
    expect(helpers.concatStringIfAbsent('foobar', 'bar')).toBe('foobar');
  });

  it('findMatchInObject returns match', () => {
    expect(helpers.findMatchInObject({ xfoo: [{ text: 'bar' }] }, 'foo', 'x')).toBe('bar');
    expect(helpers.findMatchInObject({}, 'foo', 'x')).toBe('');
  });

  it('filterArrayByKey filters by key', () => {
    expect(helpers.filterArrayByKey([{ a: 'x' }, { a: '' }], 'a')).toEqual([{ a: 'x' }]);
  });

  it('mergeChatCountArrays merges arrays', () => {
    const arr1 = [{ time: 't', chatCount: 1 }];
    const arr2 = [{ time: 't', chatCount: 2 }];
    const arr3 = [{ time: 't', chatCount: 3 }];
    expect(helpers.mergeChatCountArrays(arr1, arr2, arr3)).toEqual([{ time: 't', chatCount: 6 }]);
  });

  it('notEmpty calls fn or inverse', () => {
    const options = { fn: (): string => 'yes', inverse: (): string => 'no' };
    expect(helpers.notEmpty('foo', options)).toBe('yes');
    expect(helpers.notEmpty('', options)).toBe('no');
  });

  it('isType checks type', () => {
    expect(helpers.isType('string', 'foo')).toBe(true);
    expect(helpers.isType('number', 1)).toBe(true);
    expect(helpers.isType('object', {})).toBe(true);
  });

  it('filterOutServicesConnectedToIntent filters services', () => {
    const body = {
      connections: [{ service: 'a' }],
      services: [{ serviceId: 'a' }, { serviceId: 'b' }],
    };
    expect(helpers.filterOutServicesConnectedToIntent(body)).toEqual([{ serviceId: 'b' }]);
  });

  it('extractServiceTriggerName and extractServiceTriggerParams', () => {
    expect(helpers.extractServiceTriggerName('#foo;bar;baz')).toBe('foo');
    expect(helpers.extractServiceTriggerParams('#foo;bar;baz')).toEqual(['bar', 'baz']);
  });

  it('ignoreBlacklist returns empty if blacklisted', () => {
    expect(helpers.ignoreBlacklist('foo bar', ['bar'])).toBe('');
    expect(helpers.ignoreBlacklist('foo baz', ['bar'])).toBe('foo baz');
  });

  it('getObjectKeyFromObjectArray returns key value', () => {
    const arr = [{ obj: 'x', val: 1 }];
    expect(helpers.getObjectKeyFromObjectArray(arr, 'obj', 'x', 'val')).toBe(1);
    expect(helpers.getObjectKeyFromObjectArray(arr, 'obj', 'y', 'val')).toBeUndefined();
  });

  it('formatDataByRole returns formatted string', () => {
    const data = {
      botMessages: [
        {
          seosed: [
            {
              isiku_roll: 'r',
              isiku_roll_tekstina: 'Role',
              eesnimi: 'A',
              nimi_arinimi: 'B',
              isikukood_registrikood: '123',
            },
          ],
        },
      ],
    };
    expect(helpers.formatDataByRole(data)).toMatch(/Role/);
  });

  it('formatDataByContactType returns formatted string', () => {
    const data = {
      botMessages: [
        {
          sidevahendid: [
            { liik: 'MOB', sisu: '123' },
            { liik: 'EMAIL', sisu: 'a@b.com' },
          ],
        },
      ],
    };
    expect(helpers.formatDataByContactType(data)).toMatch(/Telefon/);
    expect(helpers.formatDataByContactType(data)).toMatch(/E-post/);
  });

  it('formatDataByBusinessRegister returns formatted string', () => {
    const data = {
      botMessages: [
        {
          kasusaajad: [
            {
              kontrolli_teostamise_viis: 'r',
              kontrolli_teostamise_viis_tekstina: 'Role',
              eesnimi: 'A',
              nimi: 'B',
              isikukood: '123',
              aadress_riik_tekstina: 'EE',
            },
          ],
        },
      ],
    };
    expect(helpers.formatDataByBusinessRegister(data)).toMatch(/Role/);
  });

  it('filterConsumerPriceIndexData returns formatted string', () => {
    const data = { indicator: 'previous_year', years: { '2020': '2020' }, months: { '01': 'Jaanuar' }, value: [1] };
    expect(helpers.filterConsumerPriceIndexData(data)).toMatch(/Tarbijahinnaindeks/);
  });

  it('formatToReadableNumber formats number', () => {
    expect(helpers.formatToReadableNumber('1234,56')).toBe('1,234.56');
    expect(helpers.formatToReadableNumber('')).toBe('0');
  });

  it('filterCompanies filters duplicates', () => {
    const arr = [{ registry_code: '1' }, { registry_code: '1' }, { registry_code: '2' }];
    expect(helpers.filterCompanies(arr)).toEqual([{ registry_code: '1' }, { registry_code: '2' }]);
  });

  it('formatDateToEstonian formats date', () => {
    expect(helpers.formatDateToEstonian('01-01-2020')).toMatch(/jaanuaril/);
    expect(helpers.formatDateToEstonian('01-01-2020', true)).toMatch(/Jaanuaris/);
  });

  it('formatDate formats date', () => {
    expect(helpers.formatDate('2020-01-02')).toBe('02.01.2020');
  });

  it('replaceDocs replaces doc keys', () => {
    const content = 'See [doc1] and [doc2]';
    const context = {
      citations: [
        { url: 'https://a', title: 'A', filepath: '/a' },
        { url: 'https://b', title: 'B', filepath: '/b' },
      ],
    };
    expect(helpers.replaceDocs(content, context)).toMatch(/Viited/);
  });

  it('toArray wraps non-array', () => {
    expect(helpers.toArray(1)).toEqual([1]);
    expect(helpers.toArray([1, 2])).toEqual([1, 2]);
  });

  it('isValidIntentName validates names', () => {
    expect(helpers.isValidIntentName('foo_bar')).toBe(true);
    expect(helpers.isValidIntentName('foo bar')).toBe(false);
  });
});
