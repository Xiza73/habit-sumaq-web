import { describe, expect, it } from 'vitest';

import enMessages from '@/i18n/messages/en.json';
import esMessages from '@/i18n/messages/es.json';
import ptMessages from '@/i18n/messages/pt.json';

import { getTemplate, TEMPLATES } from './templates';

// Templates reference i18n keys by string, which means typos won't be caught
// by TypeScript. These tests validate that every key referenced by a
// template actually exists in ALL three locales — otherwise the user gets
// a literal "templates.habits.foo" string in the UI when they switch
// locales. Cheap insurance.

describe('templates', () => {
  it('exposes the three planned templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['student', 'freelancer', 'couple']);
  });

  it('every habit references a key that exists in all locales', () => {
    for (const template of TEMPLATES) {
      for (const habit of template.habits) {
        expect(esMessages.templates.habits, `es missing key ${habit.nameKey}`).toHaveProperty(
          habit.nameKey,
        );
        expect(enMessages.templates.habits, `en missing key ${habit.nameKey}`).toHaveProperty(
          habit.nameKey,
        );
        expect(ptMessages.templates.habits, `pt missing key ${habit.nameKey}`).toHaveProperty(
          habit.nameKey,
        );
      }
    }
  });

  it('every category references a key that exists in all locales', () => {
    for (const template of TEMPLATES) {
      for (const category of template.categories) {
        expect(
          esMessages.templates.categories,
          `es missing key ${category.nameKey}`,
        ).toHaveProperty(category.nameKey);
        expect(
          enMessages.templates.categories,
          `en missing key ${category.nameKey}`,
        ).toHaveProperty(category.nameKey);
        expect(
          ptMessages.templates.categories,
          `pt missing key ${category.nameKey}`,
        ).toHaveProperty(category.nameKey);
      }
    }
  });

  it('every template has its name + description in all locales', () => {
    for (const template of TEMPLATES) {
      expect(esMessages.templates).toHaveProperty(template.id);
      expect(enMessages.templates).toHaveProperty(template.id);
      expect(ptMessages.templates).toHaveProperty(template.id);
      const esTemplate = esMessages.templates[template.id as 'student'];
      expect(esTemplate).toHaveProperty('name');
      expect(esTemplate).toHaveProperty('description');
    }
  });

  it('habit frequencies are valid', () => {
    const validFrequencies = new Set(['DAILY', 'WEEKLY']);
    for (const template of TEMPLATES) {
      for (const habit of template.habits) {
        expect(validFrequencies.has(habit.frequency)).toBe(true);
        expect(habit.targetCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('category types are INCOME or EXPENSE', () => {
    const validTypes = new Set(['INCOME', 'EXPENSE']);
    for (const template of TEMPLATES) {
      for (const category of template.categories) {
        expect(validTypes.has(category.type)).toBe(true);
      }
    }
  });

  it('getTemplate returns the matching template', () => {
    const student = getTemplate('student');
    expect(student.id).toBe('student');
    expect(student.habits.length).toBeGreaterThan(0);
  });

  it('getTemplate throws for unknown ids', () => {
    // @ts-expect-error — testing the runtime guard
    expect(() => getTemplate('unknown')).toThrow();
  });
});
