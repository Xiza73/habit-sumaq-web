import { describe, expect, it } from 'vitest';

import {
  addMonthlyServiceParticipantSchema,
  updateMonthlyServiceParticipantSchema,
} from './monthly-service-participant.schema';

describe('addMonthlyServiceParticipantSchema', () => {
  const validInput = {
    reference: 'Ana',
    defaultAmount: 100,
  };

  it('accepts a valid payload', () => {
    const result = addMonthlyServiceParticipantSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty reference', () => {
    const result = addMonthlyServiceParticipantSchema.safeParse({
      ...validInput,
      reference: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reference exceeding 255 characters', () => {
    const result = addMonthlyServiceParticipantSchema.safeParse({
      ...validInput,
      reference: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero defaultAmount (MSP_PARTICIPANT_AMOUNT_NOT_POSITIVE)', () => {
    const result = addMonthlyServiceParticipantSchema.safeParse({
      ...validInput,
      defaultAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative defaultAmount', () => {
    const result = addMonthlyServiceParticipantSchema.safeParse({
      ...validInput,
      defaultAmount: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMonthlyServiceParticipantSchema', () => {
  it('accepts a valid defaultAmount update', () => {
    const result = updateMonthlyServiceParticipantSchema.safeParse({ defaultAmount: 120 });
    expect(result.success).toBe(true);
  });

  it('rejects zero defaultAmount', () => {
    const result = updateMonthlyServiceParticipantSchema.safeParse({ defaultAmount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects missing defaultAmount', () => {
    const result = updateMonthlyServiceParticipantSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
