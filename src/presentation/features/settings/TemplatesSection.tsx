'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCategories, useCreateCategory } from '@/core/application/hooks/use-categories';
import { useCreateHabit, useHabits } from '@/core/application/hooks/use-habits';

import { Modal } from '@/presentation/components/ui/Modal';

import { type Template, type TemplateId, TEMPLATES } from '@/lib/templates';
import { cn } from '@/lib/utils';

/**
 * Lists the pre-configured templates and lets the user apply one. Lives at
 * the bottom of the Settings page. Apply flow:
 *
 *   1. Click "Apply" on a card → preview modal opens with the full breakdown.
 *   2. Click "Confirm" → for each habit/category in the template:
 *      - if a habit with the same name (case-insensitive) already exists,
 *        skip it.
 *      - if a category with the same name + type already exists, skip it.
 *      - otherwise, fire `POST /habits` or `POST /categories`.
 *   3. Single toast at the end: "X created, Y skipped".
 *
 * Idempotent by design — the user can apply the same template twice and
 * nothing duplicates. They can also apply multiple templates and combine
 * them; overlapping items (e.g. "Ejercicio" appears in Student AND Couple)
 * are deduped.
 */
export function TemplatesSection() {
  const t = useTranslations('templates');
  const [previewing, setPreviewing] = useState<Template | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onApply={() => setPreviewing(template)}
          />
        ))}
      </div>
      {previewing && <PreviewModal template={previewing} onClose={() => setPreviewing(null)} />}
    </section>
  );
}

interface TemplateCardProps {
  template: Template;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const t = useTranslations('templates');

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">{t(`${template.id}.name` as 'student.name')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(`${template.id}.description` as 'student.description')}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {t('habitsCount', { count: template.habits.length })} ·{' '}
        {t('categoriesCount', { count: template.categories.length })}
      </p>
      <button
        type="button"
        onClick={onApply}
        className="mt-4 self-start rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
      >
        {t('applyAction')}
      </button>
    </div>
  );
}

interface PreviewModalProps {
  template: Template;
  onClose: () => void;
}

function PreviewModal({ template, onClose }: PreviewModalProps) {
  const t = useTranslations('templates');
  const tHabits = useTranslations('templates.habits');
  const tCategories = useTranslations('templates.categories');

  // Pull existing habits + categories so we can dedupe before creating.
  // `includeArchived: true` because an archived habit with the same name
  // would still collide if we created a new one.
  const { data: existingHabits } = useHabits(true);
  const { data: existingCategories } = useCategories();

  const createHabit = useCreateHabit();
  const createCategory = useCreateCategory();

  const [isApplying, setIsApplying] = useState(false);

  const templateName = t(`${template.id}.name` as 'student.name');

  async function handleConfirm() {
    setIsApplying(true);

    const existingHabitNames = new Set((existingHabits ?? []).map((h) => h.name.toLowerCase()));
    const existingCategoryKeys = new Set(
      (existingCategories ?? []).map((c) => `${c.type}::${c.name.toLowerCase()}`),
    );

    let created = 0;
    let skipped = 0;
    let hadError = false;

    for (const habit of template.habits) {
      const name = tHabits(habit.nameKey as 'read30');
      if (existingHabitNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }
      try {
        await createHabit.mutateAsync({
          name,
          frequency: habit.frequency,
          targetCount: habit.targetCount,
          color: habit.color ?? null,
        });
        created++;
      } catch {
        // Treat per-item failures as a skip — we still want the other items
        // to land. The aggregate toast at the end calls out partial success.
        skipped++;
        hadError = true;
      }
    }

    for (const category of template.categories) {
      const name = tCategories(category.nameKey as 'food');
      const key = `${category.type}::${name.toLowerCase()}`;
      if (existingCategoryKeys.has(key)) {
        skipped++;
        continue;
      }
      try {
        await createCategory.mutateAsync({
          name,
          type: category.type,
          color: category.color ?? null,
        });
        created++;
      } catch {
        skipped++;
        hadError = true;
      }
    }

    setIsApplying(false);

    if (hadError && created === 0) {
      toast.error(t('errorToast'));
      return;
    }

    if (skipped > 0) {
      toast.success(t('successWithSkipped', { created, skipped }));
    } else {
      toast.success(t('successCreatedOnly', { created }));
    }
    onClose();
  }

  const incomeCategories = template.categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = template.categories.filter((c) => c.type === 'EXPENSE');

  return (
    <Modal open onClose={onClose} title={t('previewTitle', { name: templateName })}>
      <div className="space-y-5">
        <section>
          <h3 className="text-sm font-semibold">{t('previewHabits')}</h3>
          <ul className="mt-2 space-y-1.5">
            {template.habits.map((habit) => (
              <li
                key={habit.nameKey}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn('inline-block size-2 shrink-0 rounded-full bg-primary')}
                  style={habit.color ? { backgroundColor: habit.color } : undefined}
                />
                {tHabits(habit.nameKey as 'read30')}
              </li>
            ))}
          </ul>
        </section>

        {expenseCategories.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold">
              {t('previewCategories')} — {t('previewExpense')}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {expenseCategories.map((category) => (
                <li
                  key={category.nameKey}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={cn('inline-block size-2 shrink-0 rounded-full bg-primary')}
                    style={category.color ? { backgroundColor: category.color } : undefined}
                  />
                  {tCategories(category.nameKey as 'food')}
                </li>
              ))}
            </ul>
          </section>
        )}

        {incomeCategories.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold">
              {t('previewCategories')} — {t('previewIncome')}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {incomeCategories.map((category) => (
                <li
                  key={category.nameKey}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={cn('inline-block size-2 shrink-0 rounded-full bg-primary')}
                    style={category.color ? { backgroundColor: category.color } : undefined}
                  />
                  {tCategories(category.nameKey as 'food')}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {t('cancelAction')}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isApplying}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isApplying && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isApplying ? t('applying') : t('confirmAction')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Re-exported for tests that need to programmatically pick a template.
export { type TemplateId };
