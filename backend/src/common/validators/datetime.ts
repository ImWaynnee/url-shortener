import type { ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';

export function IsISO8601WithTZandTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isISO8601WithTZandTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          // Require Z (UTC) only at the end
          return typeof value === 'string' &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);
        },
        defaultMessage() {
          return 'Must be a valid ISO 8601 datetime in UTC (e.g., 2024-01-01T12:00:00Z)';
        }
      }
    });
  };
}