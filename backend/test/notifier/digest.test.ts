import { describe, it, expect } from 'vitest';
import { composeDigest } from '../../src/notifier/digest';
import type { StoredMessage } from '../../src/shared/types';

const m = (id: string, email: string): StoredMessage => ({
  id, name: `N-${id}`, email, message: `msg-${id}`,
  createdAt: '2026-06-02T12:00:00.000Z', ip: '1.2.3.4', userAgent: 'UA',
});

describe('composeDigest', () => {
  it('summarizes the count in the subject', () => {
    const { subject } = composeDigest([m('a', 'a@x.co'), m('b', 'b@x.co')]);
    expect(subject).toBe('Portfolio: 2 new contact submissions');
  });
  it('uses singular subject for one message', () => {
    expect(composeDigest([m('a', 'a@x.co')]).subject).toBe('Portfolio: 1 new contact submission');
  });
  it('includes each sender name, email, and message in the body', () => {
    const { body } = composeDigest([m('a', 'a@x.co'), m('b', 'b@x.co')]);
    expect(body).toContain('N-a');
    expect(body).toContain('a@x.co');
    expect(body).toContain('msg-a');
    expect(body).toContain('N-b');
    expect(body).toContain('msg-b');
  });
  it('lists the first sender as Reply-To target', () => {
    const { replyTo } = composeDigest([m('a', 'first@x.co'), m('b', 'b@x.co')]);
    expect(replyTo).toBe('first@x.co');
  });
});
