import { type CategoryType } from '@/core/domain/enums/category.enums';
import { type HabitFrequency } from '@/core/domain/enums/habit.enums';

/**
 * Pre-configured starter packs the user can apply from Settings to bootstrap
 * their setup with a coherent set of habits + categories. Frontend-only by
 * design: when the user applies a template, we issue plain
 * `POST /habits` and `POST /categories` calls. The server has no concept of
 * "templates" — they're a UX construct that lives here.
 *
 * The shape (which habits, which categories) is fixed per template; the
 * NAMES are i18n-keyed so they translate per locale. Names live under
 * `templates.habits.*` and `templates.categories.*` in
 * `src/i18n/messages/{locale}.json`, shared across templates so the same
 * "Ejercicio" string serves Student and Pareja without duplication.
 */

export type TemplateId = 'student' | 'freelancer' | 'couple';

export interface TemplateHabit {
  /** Key under `templates.habits.*` in the locale files. */
  nameKey: string;
  frequency: HabitFrequency;
  targetCount: number;
  color?: string;
}

export interface TemplateCategory {
  /** Key under `templates.categories.*` in the locale files. */
  nameKey: string;
  type: CategoryType;
  color?: string;
}

export interface Template {
  id: TemplateId;
  habits: TemplateHabit[];
  categories: TemplateCategory[];
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'student',
    habits: [
      { nameKey: 'read30', frequency: 'DAILY', targetCount: 1, color: '#0EA5E9' },
      { nameKey: 'study', frequency: 'DAILY', targetCount: 1, color: '#8B5CF6' },
      { nameKey: 'exercise', frequency: 'DAILY', targetCount: 1, color: '#22C55E' },
      { nameKey: 'sleep8', frequency: 'DAILY', targetCount: 1, color: '#6366F1' },
    ],
    categories: [
      { nameKey: 'food', type: 'EXPENSE', color: '#F59E0B' },
      { nameKey: 'transport', type: 'EXPENSE', color: '#06B6D4' },
      { nameKey: 'studyMaterials', type: 'EXPENSE', color: '#A855F7' },
      { nameKey: 'outings', type: 'EXPENSE', color: '#EC4899' },
      { nameKey: 'allowance', type: 'INCOME', color: '#10B981' },
      { nameKey: 'partTimeJob', type: 'INCOME', color: '#84CC16' },
    ],
  },
  {
    id: 'freelancer',
    habits: [
      { nameKey: 'deepWork', frequency: 'DAILY', targetCount: 1, color: '#3B82F6' },
      { nameKey: 'exercise', frequency: 'DAILY', targetCount: 1, color: '#22C55E' },
      { nameKey: 'networking', frequency: 'WEEKLY', targetCount: 2, color: '#F59E0B' },
      { nameKey: 'learning', frequency: 'DAILY', targetCount: 1, color: '#8B5CF6' },
    ],
    categories: [
      { nameKey: 'software', type: 'EXPENSE', color: '#6366F1' },
      { nameKey: 'coworking', type: 'EXPENSE', color: '#0EA5E9' },
      { nameKey: 'taxes', type: 'EXPENSE', color: '#EF4444' },
      { nameKey: 'food', type: 'EXPENSE', color: '#F59E0B' },
      { nameKey: 'health', type: 'EXPENSE', color: '#EC4899' },
      { nameKey: 'clientA', type: 'INCOME', color: '#10B981' },
      { nameKey: 'clientB', type: 'INCOME', color: '#84CC16' },
      { nameKey: 'oneOffJobs', type: 'INCOME', color: '#22C55E' },
    ],
  },
  {
    id: 'couple',
    habits: [
      { nameKey: 'qualityTime', frequency: 'DAILY', targetCount: 1, color: '#EC4899' },
      { nameKey: 'exercise', frequency: 'DAILY', targetCount: 1, color: '#22C55E' },
      { nameKey: 'weeklyMoneyMeeting', frequency: 'WEEKLY', targetCount: 1, color: '#F59E0B' },
    ],
    categories: [
      { nameKey: 'home', type: 'EXPENSE', color: '#0EA5E9' },
      { nameKey: 'food', type: 'EXPENSE', color: '#F59E0B' },
      { nameKey: 'outings', type: 'EXPENSE', color: '#EC4899' },
      { nameKey: 'sharedSubscriptions', type: 'EXPENSE', color: '#8B5CF6' },
      { nameKey: 'services', type: 'EXPENSE', color: '#A855F7' },
      { nameKey: 'salaryPerson1', type: 'INCOME', color: '#10B981' },
      { nameKey: 'salaryPerson2', type: 'INCOME', color: '#84CC16' },
      { nameKey: 'other', type: 'INCOME', color: '#06B6D4' },
    ],
  },
];

export function getTemplate(id: TemplateId): Template {
  const found = TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown template id: ${id}`);
  return found;
}
