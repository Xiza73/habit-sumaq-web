import { type AccountType, type Currency } from '@/core/domain/enums/account.enums';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
