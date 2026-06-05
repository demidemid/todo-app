export type DueDateState = 'without_due_date' | 'due_today' | 'due_tomorrow' | 'overdue' | 'none';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_REMINDER_HOUR = 9;

export interface DueDateTaskLike {
  dueDate?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  status?: string;
  remindOneDayBefore?: boolean;
  reminderScheduledAt?: string | null;
}

const isCompleted = (task: DueDateTaskLike): boolean => {
  if (typeof task.isCompleted === 'boolean') {
    return task.isCompleted;
  }

  return task.status === 'done';
};

const parseLocalDate = (value: string): Date | null => {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);

  const parsed = new Date(year, monthIndex, day);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() !== monthIndex
    || parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const formatLocalDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addLocalDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

export const getDueDateState = (task: DueDateTaskLike, now: Date = new Date()): DueDateState => {
  if (!task.dueDate) {
    return 'without_due_date';
  }

  if (isCompleted(task)) {
    return 'none';
  }

  const today = formatLocalDate(now);
  const tomorrow = formatLocalDate(addLocalDays(now, 1));

  if (task.dueDate === today) {
    return 'due_today';
  }

  if (task.dueDate === tomorrow) {
    return 'due_tomorrow';
  }

  if (task.dueDate < today) {
    return 'overdue';
  }

  return 'none';
};

export const getReminderTriggerDate = (task: DueDateTaskLike): Date | null => {
  if (!task.dueDate) {
    return null;
  }

  const dueDate = parseLocalDate(task.dueDate);
  if (!dueDate) {
    return null;
  }

  const triggerDate = addLocalDays(dueDate, -1);
  triggerDate.setHours(ONE_DAY_REMINDER_HOUR, 0, 0, 0);
  return triggerDate;
};

export const shouldScheduleOneDayReminder = (task: DueDateTaskLike, now: Date = new Date()): boolean => {
  if (!task.dueDate || !task.remindOneDayBefore) {
    return false;
  }

  if (isCompleted(task)) {
    return false;
  }

  const triggerDate = getReminderTriggerDate(task);
  if (!triggerDate) {
    return false;
  }

  return triggerDate.getTime() > now.getTime();
};

export const resolveReminderScheduledAt = (task: DueDateTaskLike, now: Date = new Date()): string | null => {
  if (!shouldScheduleOneDayReminder(task, now)) {
    return null;
  }

  const triggerDate = getReminderTriggerDate(task);
  if (!triggerDate) {
    return null;
  }

  return triggerDate.toISOString();
};

export const shouldFireScheduledReminder = (task: DueDateTaskLike, now: Date = new Date()): boolean => {
  if (!task.reminderScheduledAt || !task.remindOneDayBefore || !task.dueDate) {
    return false;
  }

  if (isCompleted(task)) {
    return false;
  }

  const scheduledDate = new Date(task.reminderScheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return false;
  }

  return scheduledDate.getTime() <= now.getTime();
};
