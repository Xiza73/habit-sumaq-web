import { type AccountType } from '@/core/domain/enums/account.enums';
import { type Currency } from '@/core/domain/enums/currency.enum';

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
