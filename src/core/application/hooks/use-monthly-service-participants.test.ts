import { describe, expect, it } from 'vitest';

import {
  addMonthlyServiceParticipantSchema,
  updateMonthlyServiceParticipantSchema,
} from '@/core/domain/schemas/monthly-service-participant.schema';

import { monthlyServiceParticipantKeys } from './use-monthly-service-participants';

describe('monthlyServiceParticipantKeys', () => {
  it('roots every key under ["monthly-service-participants"]', () => {
    expect(monthlyServiceParticipantKeys.all).toEqual(['monthly-service-participants']);
  });

  it('scopes the list key by monthlyServiceId', () => {
    expect(monthlyServiceParticipantKeys.list('svc-1')).toEqual([
      'monthly-service-participants',
      'list',
      'svc-1',
    ]);
  });

  it('produces different list keys for different services', () => {
    expect(monthlyServiceParticipantKeys.list('svc-1')).not.toEqual(
      monthlyServiceParticipantKeys.list('svc-2'),
    );
  });
});

// Re-exercise the schemas through the hook module's re-export surface so
// this file also covers the input types the mutations accept — mirrors
// `use-monthly-service-payments.test.ts`'s pattern of colocating schema
// coverage next to the hooks that consume it.
describe('participant schemas used by the hooks', () => {
  it('accepts a valid add-participant payload', () => {
    expect(
      addMonthlyServiceParticipantSchema.safeParse({ reference: 'Ana', defaultAmount: 100 })
        .success,
    ).toBe(true);
  });

  it('accepts a valid update-participant payload', () => {
    expect(updateMonthlyServiceParticipantSchema.safeParse({ defaultAmount: 120 }).success).toBe(
      true,
    );
  });
});
