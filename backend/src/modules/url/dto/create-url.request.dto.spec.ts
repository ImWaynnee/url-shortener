import 'reflect-metadata';

import { CreateUrlRequest } from '@modules/url/dto/create-url.request.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

async function check(url: unknown) {
  const inst = plainToInstance(CreateUrlRequest, { url });
  return validate(inst);
}

async function isValid(url: unknown) {
  return (await check(url)).length === 0;
}

async function isInvalid(url: unknown) {
  return (await check(url)).length > 0;
}

describe('CreateUrlRequest — shorten endpoint validation', () => {
  describe('valid URLs', () => {
    it('accepts a standard https URL', async () => {
      expect(await isValid('https://example.com')).toBe(true);
    });

    it('accepts a standard http URL', async () => {
      expect(await isValid('http://example.com/path?q=1')).toBe(true);
    });

    it('accepts a protocol-relative URL (no scheme)', async () => {
      expect(await isValid('example.com')).toBe(true);
    });

    it('accepts https URL with "javascript" in the path (not a dangerous protocol)', async () => {
      expect(await isValid('https://example.com/javascript/tutorial')).toBe(true);
    });

    it('accepts https URL with "javascript" as part of a query param value', async () => {
      expect(await isValid('https://example.com/page?lang=javascript')).toBe(true);
    });

    it('accepts a domain that starts with "javascript" (e.g. javascript.com)', async () => {
      expect(await isValid('https://javascript.com')).toBe(true);
    });

    it('accepts https URL with a fragment containing "javascript"', async () => {
      expect(await isValid('https://example.com/docs#javascript-api')).toBe(true);
    });
  });

  describe('raw JavaScript injection', () => {
    it('rejects javascript: protocol', async () => {
      expect(await isInvalid('javascript:alert(1)')).toBe(true);
    });

    it('rejects JavaScript: mixed-case', async () => {
      expect(await isInvalid('JavaScript:alert(1)')).toBe(true);
    });

    it('rejects JAVASCRIPT: all-caps', async () => {
      expect(await isInvalid('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('rejects vbscript: protocol', async () => {
      expect(await isInvalid('vbscript:msgbox(1)')).toBe(true);
    });

    it('rejects data: protocol with HTML payload', async () => {
      expect(await isInvalid('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('rejects data: protocol with base64-encoded payload', async () => {
      expect(
        await isInvalid('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')
      ).toBe(true);
    });
  });

  describe('percent-encoded JavaScript injection', () => {
    it('rejects javascript%3Aalert(1) (encoded colon, uppercase hex)', async () => {
      expect(await isInvalid('javascript%3Aalert(1)')).toBe(true);
    });

    it('rejects javascript%3aalert(1) (encoded colon, lowercase hex)', async () => {
      expect(await isInvalid('javascript%3aalert(1)')).toBe(true);
    });

    it('rejects data%3Atext/html,<script>alert(1)</script>', async () => {
      expect(await isInvalid('data%3Atext/html,<script>alert(1)</script>')).toBe(true);
    });

    it('rejects vbscript%3Amsgbox(1)', async () => {
      expect(await isInvalid('vbscript%3Amsgbox(1)')).toBe(true);
    });
  });

  describe('javascript:// host-component injection', () => {
    // javascript://host/path is still a javascript: URL — the //host part is parsed
    // as a comment by the JS engine, making the path the executed code.
    it('rejects javascript://example.com/%0Aalert(1)', async () => {
      expect(await isInvalid('javascript://example.com/%0Aalert(1)')).toBe(true);
    });

    it('rejects javascript://example.com/alert(1)', async () => {
      expect(await isInvalid('javascript://example.com/alert(1)')).toBe(true);
    });

    it('rejects data://example.com/%0A<img onerror=alert(1)>', async () => {
      expect(await isInvalid('data://example.com/%0A<img onerror=alert(1)>')).toBe(true);
    });
  });

  describe('whitespace-obfuscated injection', () => {
    it('rejects javascript: with a leading space', async () => {
      expect(await isInvalid(' javascript:alert(1)')).toBe(true);
    });

    it('rejects java\\tscript: with an embedded tab', async () => {
      expect(await isInvalid('java\tscript:alert(1)')).toBe(true);
    });

    it('rejects javascript: with an embedded newline', async () => {
      expect(await isInvalid('java\nscript:alert(1)')).toBe(true);
    });
  });

  describe('error messages', () => {
    it('returns the disallowed-protocol message for javascript: injection', async () => {
      const errors = await check('javascript:alert(1)');
      const constraint = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      expect(constraint).toContain('URL contains a disallowed protocol');
    });
  });
});
