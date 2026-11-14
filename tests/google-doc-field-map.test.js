import { describe, expect, it } from 'vitest';
import { validateFieldMap } from '../schema/google-doc-field-map-lib.mjs';

describe('Google Doc field map', () => {
  it('flags every field in every schema example', () => {
    const result = validateFieldMap();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.files).toBe(18);
    expect(result.summary.fields).toBeGreaterThan(200);
  });
});
