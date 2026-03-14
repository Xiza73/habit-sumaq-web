import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error';

describe('ApiError', () => {
  it('creates an error with message only', () => {
    const error = new ApiError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error.name).toBe('ApiError');
  });

  it('creates an error with message and code', () => {
    const error = new ApiError('Not found', 'ACC_001');
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('ACC_001');
  });

  it('creates an error with message, code, and details', () => {
    const details = [{ field: 'name', message: 'required' }];
    const error = new ApiError('Validation failed', 'VALIDATION', details);
    expect(error.details).toEqual(details);
    expect(error.details).toHaveLength(1);
    expect(error.details![0].field).toBe('name');
  });

  it('is an instance of Error', () => {
    const error = new ApiError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});
