import { describe, it, expect } from 'vitest';
import {
  isHoneypotTripped,
  isTooFast,
  isValidEmail,
  sanitizeName,
  MIN_FORM_TIME_MS,
} from '../../src/shared/validation';

describe('isHoneypotTripped', () => {
  it('passes when website is empty', () => {
    expect(isHoneypotTripped({ website: '' })).toBe(false);
    expect(isHoneypotTripped({ website: '   ' })).toBe(false);
  });
  it('trips when website is filled', () => {
    expect(isHoneypotTripped({ website: 'http://spam' })).toBe(true);
  });
});

describe('isTooFast', () => {
  it('rejects submissions faster than the minimum', () => {
    const now = 1_000_000;
    expect(isTooFast(now - (MIN_FORM_TIME_MS - 1), now)).toBe(true);
  });
  it('allows submissions at or past the minimum', () => {
    const now = 1_000_000;
    expect(isTooFast(now - MIN_FORM_TIME_MS, now)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });
  it('rejects malformed or oversized addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('x'.repeat(255) + '@b.co')).toBe(false);
  });
});

describe('sanitizeName', () => {
  it('strips CR, LF, tabs and control chars (header-injection fix)', () => {
    expect(sanitizeName('Alice\nBcc: evil@x.com')).toBe('AliceBcc: evil@x.com');
    expect(sanitizeName('A\r\nB\tC')).toBe('ABC');
  });
  it('caps length at 200 chars', () => {
    expect(sanitizeName('a'.repeat(500)).length).toBe(200);
  });
});
