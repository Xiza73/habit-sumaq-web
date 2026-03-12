import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('accounts');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
          S
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="max-w-md text-muted-foreground">
          Habit Sumaq — Finanzas personales y hábitos
        </p>
        <div className="flex gap-3">
          <div className="rounded-lg bg-income/10 px-4 py-2 text-income">Income</div>
          <div className="rounded-lg bg-expense/10 px-4 py-2 text-expense">Expense</div>
          <div className="rounded-lg bg-transfer/10 px-4 py-2 text-transfer">Transfer</div>
        </div>
      </div>
    </div>
  );
}
