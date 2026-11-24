import { z } from "zod";

/**
 * Shared field-level schemas for student data.
 * Import pipeline and API query validation should reuse these rules
 * instead of re-implementing them in UI or route handlers.
 */

export const studentIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9-]+$/, "Student ID may only contain letters, digits, and hyphens")
  .transform((value) => value.toUpperCase());

export const fullNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(2).max(100));

export const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

export const gradeLevelSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Grade level must be a whole number")
  .transform((value) => Number(value))
  .pipe(z.number().int().min(1).max(12));

export const sectionSchema = z
  .string()
  .trim()
  .regex(/^[A-Fa-f]$/, "Section must be a letter from A to F")
  .transform((value) => value.toUpperCase());

export const markSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d+)?$/, "Mark must be a number")
  .transform((value) => Number(value))
  .pipe(z.number().min(0).max(100));

/**
 * Parses YYYY-MM-DD or DD/MM/YYYY into a UTC calendar date.
 * Returns null when the format is wrong or the calendar date is impossible.
 */
export function parseDateOfBirth(raw: string): Date | null {
  const trimmed = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dmyMatch) {
    day = Number(dmyMatch[1]);
    month = Number(dmyMatch[2]);
    year = Number(dmyMatch[3]);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Age in whole years on the given calendar date (import date).
 */
export function ageOnDate(dateOfBirth: Date, onDate: Date): number {
  let age = onDate.getFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = onDate.getMonth() - dateOfBirth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && onDate.getDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function isValidStudentAge(dateOfBirth: Date, onDate: Date): boolean {
  const age = ageOnDate(dateOfBirth, onDate);
  return age >= 5 && age <= 25;
}
