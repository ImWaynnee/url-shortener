import type { ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';

const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript):/i;

export function IsNotDangerousUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotDangerousUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true;
          // Strip whitespace/control chars (e.g. java\tscript:) then decode percent-encoding
          const stripped = value.replace(/[\s\x00-\x1F]/g, '');
          let decoded: string;
          try {
            decoded = decodeURIComponent(stripped);
          } catch {
            decoded = stripped;
          }
          return !DANGEROUS_PROTOCOL.test(decoded);
        },
        defaultMessage() {
          return 'URL contains a disallowed protocol';
        }
      }
    });
  };
}
