import { describe, expect, it } from 'vitest';

import {
  monthlyServiceParticipantRowSchema,
  replaceMonthlyServiceParticipantsSchema,
} from './monthly-service-participant.schema';

describe('monthlyServiceParticipantRowSchema', () => {
  const validInput = {
    reference: 'Ana',
    defaultAmount: 100,
  };

  it('accepts a valid payload', () => {
    const result = monthlyServiceParticipantRowSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty reference', () => {
    const result = monthlyServiceParticipantRowSchema.safeParse({
      ...validInput,
      reference: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reference exceeding 255 characters', () => {
    const result = monthlyServiceParticipantRowSchema.safeParse({
      ...validInput,
      reference: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero defaultAmount (MSP_PARTICIPANT_AMOUNT_NOT_POSITIVE)', () => {
    const result = monthlyServiceParticipantRowSchema.safeParse({
      ...validInput,
      defaultAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative defaultAmount', () => {
    const result = monthlyServiceParticipantRowSchema.safeParse({
      ...validInput,
      defaultAmount: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe('replaceMonthlyServiceParticipantsSchema', () => {
  it('accepts an empty array (clears all configured participants)', () => {
    const result = replaceMonthlyServiceParticipantsSchema.safeParse({ participants: [] });
    expect(result.success).toBe(true);
  });

  it('accepts multiple valid rows', () => {
    const result = replaceMonthlyServiceParticipantsSchema.safeParse({
      participants: [
        { reference: 'Ana', defaultAmount: 100 },
        { reference: 'Luis', defaultAmount: 50 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when any row is invalid', () => {
    const result = replaceMonthlyServiceParticipantsSchema.safeParse({
      participants: [
        { reference: 'Ana', defaultAmount: 100 },
        { reference: '', defaultAmount: 50 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing participants field', () => {
    const result = replaceMonthlyServiceParticipantsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
