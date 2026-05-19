import { describe, expect, it } from 'vitest';
import { banner } from '../src/index';

describe('banner', () => {
  it('returns the ready string', () => {
    expect(banner()).toBe('compatibility-checker ready');
  });
});
