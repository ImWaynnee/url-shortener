import 'reflect-metadata';

import { IsISO8601WithTZandTime } from '@common/validators/datetime';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

class TestDto {
  @IsISO8601WithTZandTime()
  date!: unknown;
}

async function check(value: unknown) {
  const inst = plainToInstance(TestDto, { date: value });
  return validate(inst);
}

describe('IsISO8601WithTZandTime', () => {
  it('accepts a valid UTC ISO 8601 datetime', async () => {
    expect(await check('2024-01-01T12:00:00Z')).toHaveLength(0);
  });

  it('accepts datetime with milliseconds', async () => {
    expect(await check('2024-06-15T23:59:59.999Z')).toHaveLength(0);
  });

  it('rejects a date-only string', async () => {
    expect((await check('2024-01-01')).length).toBeGreaterThan(0);
  });

  it('rejects a datetime with non-UTC offset', async () => {
    expect((await check('2024-01-01T12:00:00+05:00')).length).toBeGreaterThan(0);
  });

  it('rejects a non-string value', async () => {
    expect((await check(12345)).length).toBeGreaterThan(0);
  });

  it('rejects a datetime without time component', async () => {
    expect((await check('2024-01-01T00:00:00')).length).toBeGreaterThan(0);
  });

  it('defaultMessage returns the expected string', async () => {
    const errors = await check('invalid');
    expect(errors[0].constraints).toMatchObject({
      isISO8601WithTZandTime: 'Must be a valid ISO 8601 datetime in UTC (e.g., 2024-01-01T12:00:00Z)'
    });
  });
});
