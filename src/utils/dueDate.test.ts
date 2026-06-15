import { describe, expect, it } from 'vitest';
import {
  formatDueDateBadgeLabel,
  getDueDateState,
  getReminderTriggerDate,
  resolveReminderScheduledAt,
  shouldFireScheduledReminder,
  shouldScheduleOneDayReminder,
  type DueDateTaskLike,
} from './dueDate';

const now = new Date('2026-06-02T12:00:00');

const createTask = (overrides: Partial<DueDateTaskLike> = {}): DueDateTaskLike => ({
  dueDate: null,
  isCompleted: false,
  remindOneDayBefore: false,
  reminderScheduledAt: null,
  status: 'todo',
  ...overrides,
});

describe('dueDate utils', () => {
  it('formats due date badge label as day and english short month', () => {
    expect(formatDueDateBadgeLabel('2026-06-15')).toBe('15 Jun');
  });

  it('returns original value for invalid due date label input', () => {
    expect(formatDueDateBadgeLabel('invalid-date')).toBe('invalid-date');
    expect(formatDueDateBadgeLabel(null)).toBeNull();
  });

  it('returns without_due_date when task has no due date', () => {
    expect(getDueDateState(createTask(), now)).toBe('without_due_date');
  });

  it('returns due_today when due date is local today', () => {
    expect(getDueDateState(createTask({ dueDate: '2026-06-02' }), now)).toBe('due_today');
  });

  it('returns due_tomorrow when due date is local tomorrow', () => {
    expect(getDueDateState(createTask({ dueDate: '2026-06-03' }), now)).toBe('due_tomorrow');
  });

  it('uses local date boundary near midnight (not UTC boundary)', () => {
    const nearMidnightLocal = new Date(2026, 5, 2, 23, 30, 0);
    expect(getDueDateState(createTask({ dueDate: '2026-06-03' }), nearMidnightLocal)).toBe('due_tomorrow');
  });

  it('returns overdue when due date is in the past and task is not completed', () => {
    expect(getDueDateState(createTask({ dueDate: '2026-06-01' }), now)).toBe('overdue');
  });

  it('returns none for completed tasks even when due date is in the past', () => {
    expect(getDueDateState(createTask({ dueDate: '2026-06-01', isCompleted: true }), now)).toBe('none');
  });

  it('uses legacy done status as completion fallback', () => {
    expect(getDueDateState(createTask({ dueDate: '2026-06-01', isCompleted: undefined, status: 'done' }), now)).toBe('none');
  });

  it('schedules 1-day reminder only for future due date with enabled toggle', () => {
    expect(
      shouldScheduleOneDayReminder(createTask({ dueDate: '2026-06-05', remindOneDayBefore: true }), now)
    ).toBe(true);
  });

  it('does not schedule reminder for null, today, or past due dates', () => {
    expect(shouldScheduleOneDayReminder(createTask({ dueDate: null, remindOneDayBefore: true }), now)).toBe(false);
    expect(shouldScheduleOneDayReminder(createTask({ dueDate: '2026-06-02', remindOneDayBefore: true }), now)).toBe(false);
    expect(shouldScheduleOneDayReminder(createTask({ dueDate: '2026-06-01', remindOneDayBefore: true }), now)).toBe(false);
  });

  it('returns trigger date on previous local day at 09:00', () => {
    const trigger = getReminderTriggerDate(createTask({ dueDate: '2026-06-05' }));

    expect(trigger).toBeTruthy();
    expect(trigger?.getFullYear()).toBe(2026);
    expect(trigger?.getMonth()).toBe(5);
    expect(trigger?.getDate()).toBe(4);
    expect(trigger?.getHours()).toBe(9);
    expect(trigger?.getMinutes()).toBe(0);
  });

  it('resolves scheduled reminder timestamp for future due date', () => {
    const reminderScheduledAt = resolveReminderScheduledAt(
      createTask({ dueDate: '2026-06-05', remindOneDayBefore: true }),
      now
    );

    expect(reminderScheduledAt).toBeTruthy();
  });

  it('cancels reminder when task is completed before fire', () => {
    expect(
      resolveReminderScheduledAt(createTask({ dueDate: '2026-06-05', remindOneDayBefore: true, isCompleted: true }), now)
    ).toBeNull();
  });

  it('reschedules reminder when due date changes from one future day to another', () => {
    const initial = resolveReminderScheduledAt(
      createTask({ dueDate: '2026-06-05', remindOneDayBefore: true }),
      now
    );
    const changed = resolveReminderScheduledAt(
      createTask({ dueDate: '2026-06-06', remindOneDayBefore: true }),
      now
    );

    expect(initial).toBeTruthy();
    expect(changed).toBeTruthy();
    expect(initial).not.toBe(changed);
  });

  it('cancels schedule when due date changes from future to past or is cleared', () => {
    expect(resolveReminderScheduledAt(createTask({ dueDate: '2026-06-01', remindOneDayBefore: true }), now)).toBeNull();
    expect(resolveReminderScheduledAt(createTask({ dueDate: null, remindOneDayBefore: true }), now)).toBeNull();
  });

  it('supports reopening a completed task by scheduling again when eligible', () => {
    const reopened = resolveReminderScheduledAt(
      createTask({ dueDate: '2026-06-05', remindOneDayBefore: true, isCompleted: false, completedAt: null }),
      now
    );

    expect(reopened).toBeTruthy();
  });

  it('fires reminder only when scheduled time is reached and task is still eligible', () => {
    const shouldFire = shouldFireScheduledReminder(
      createTask({
        dueDate: '2026-06-05',
        remindOneDayBefore: true,
        reminderScheduledAt: new Date('2026-06-02T08:00:00Z').toISOString(),
      }),
      new Date('2026-06-02T12:00:00Z')
    );

    expect(shouldFire).toBe(true);
    expect(
      shouldFireScheduledReminder(
        createTask({
          dueDate: '2026-06-05',
          remindOneDayBefore: true,
          reminderScheduledAt: new Date('2026-06-03T08:00:00Z').toISOString(),
        }),
        new Date('2026-06-02T12:00:00Z')
      )
    ).toBe(false);
  });
});
