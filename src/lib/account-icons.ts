import {
  Banknote,
  CreditCard,
  Landmark,
  type LucideIcon,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';

import { type AccountType } from '@/core/domain/enums/account.enums';

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  credit_card: CreditCard,
  investment: TrendingUp,
};
