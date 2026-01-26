import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { Logger } from '@nestjs/common';

const logger = new Logger('TimeUtils');

/**
 * Converts a Unix timestamp (seconds) to a JavaScript Date object.
 * @param timestamp - Unix timestamp in seconds.
 * @returns Date object.
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Converts a JavaScript Date object to a Unix timestamp (seconds).
 * @param date - Date object or null.
 * @returns Unix timestamp or null if date is null.
 */
export function dateToTimestamp(date: Date | null): number | null {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

/**
 * Retrieves the UTC offset string for a given IANA timezone.
 * @param timezone - IANA timezone string (e.g., "America/New_York").
 * @returns Offset string (e.g., "UTC-05:00").
 */
export function getUTCOffset(timezone: string): string {
  try {
    const now = new Date();
    // Use formatInTimeZone from date-fns-tz to get the offset
    const offset = formatInTimeZone(now, timezone, 'XXX');
    return `UTC${offset}`;
  } catch (error) {
    logger.error(`Invalid timezone: ${timezone}`, error);
    return 'UTC+00:00';
  }
}

/**
 * Maps a UTC offset string to a representative IANA timezone.
 * @param utcOffset - Offset string (e.g., "UTC-05:00").
 * @returns Corresponding IANA timezone string.
 */
export function getIANATimezone(utcOffset: string | null): string {
  try {
    // If null or empty, default to UTC
    if (!utcOffset) {
      logger.warn('utcOffset is null or empty, defaulting to UTC');
      return 'UTC';
    }

    // If already in IANA format (e.g., contains "/"), return as is
    if (utcOffset.includes('/')) {
      return utcOffset;
    }

    // Map UTC offsets to representative IANA timezones
    const UTC_TO_IANA: Record<string, string> = {
      'UTC-12:00': 'Pacific/Kwajalein',
      'UTC-11:00': 'Pacific/Midway',
      'UTC-10:00': 'Pacific/Honolulu',
      'UTC-09:00': 'America/Anchorage',
      'UTC-08:00': 'America/Los_Angeles',
      'UTC-07:00': 'America/Denver',
      'UTC-06:00': 'America/Chicago',
      'UTC-05:00': 'America/Bogota',
      'UTC-04:00': 'America/Caracas',
      'UTC-03:00': 'America/Argentina/Buenos_Aires',
      'UTC-02:00': 'Atlantic/South_Georgia',
      'UTC-01:00': 'Atlantic/Azores',
      'UTC+00:00': 'UTC',
      'UTC+01:00': 'Europe/Paris',
      'UTC+02:00': 'Europe/Athens',
      'UTC+03:00': 'Europe/Moscow',
      'UTC+04:00': 'Asia/Dubai',
      'UTC+05:00': 'Asia/Karachi',
      'UTC+06:00': 'Asia/Dhaka',
      'UTC+07:00': 'Asia/Bangkok',
      'UTC+08:00': 'Asia/Shanghai',
      'UTC+09:00': 'Asia/Tokyo',
      'UTC+10:00': 'Australia/Sydney',
      'UTC+11:00': 'Pacific/Guadalcanal',
      'UTC+12:00': 'Pacific/Auckland',
    };

    const normalized = utcOffset.trim().toUpperCase();
    const ianaTimezone = UTC_TO_IANA[normalized];

    if (ianaTimezone) {
      return ianaTimezone;
    }
    logger.warn(`Unknown UTC offset: ${utcOffset}, defaulting to UTC`);
    return 'UTC';
  } catch (error) {
    logger.error(`Error converting UTC offset: ${utcOffset}`, error);
    return 'UTC';
  }
}

/**
 * Formats a Unix timestamp into a string representation in the specified timezone.
 * @param timestampInSeconds - Unix timestamp to convert.
 * @param timezone - Target IANA timezone.
 * @returns Formatted date string.
 */
export function convertTimestampToTimezoneDate(
  timestampInSeconds: number,
  timezone: string,
): string {
  const date = new Date(timestampInSeconds * 1000);
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: timezone });
}

/**
 * Converts a Unix timestamp to a Zoned Date object.
 * @param timestampInSeconds - Unix timestamp in seconds.
 * @param timezone - Target IANA timezone.
 * @returns Date object adjusted to the target timezone.
 */
export function convertTimestampToZonedDate(
  timestampInSeconds: number,
  timezone: string,
): Date {
  const date = new Date(timestampInSeconds * 1000);

  return toZonedTime(date, timezone);
}

/**
 * Formats a Date object to a 'yyyy-MM-dd' string format in the given timezone.
 * @param date - Date to format.
 * @param timezone - Target IANA timezone.
 * @returns Formatted string.
 */
export function formatZonedDateDay(date: Date, timezone: string): string {
  return format(date, 'yyyy-MM-dd', { timeZone: timezone });
}

/**
 * Checks if two Unix timestamps occur on the same day in the specified timezone.
 * @param timestampA - First timestamp.
 * @param timestampB - Second timestamp.
 * @param timezone - Reference IANA timezone.
 * @returns True if both are on the same day.
 */
export function isSameDay(
  timestampA: number,
  timestampB: number,
  timezone: string,
): boolean {
  const dayA = formatZonedDateDay(
    convertTimestampToZonedDate(timestampA, timezone),
    timezone,
  );
  const dayB = formatZonedDateDay(
    convertTimestampToZonedDate(timestampB, timezone),
    timezone,
  );
  return dayA === dayB;
}

/**
 * Checks if a submission timestamp is exactly one day after the last solved timestamp.
 * @param submissionTs - Submission Unix timestamp.
 * @param lastSolvedTs - Last solved Unix timestamp.
 * @param timezone - Reference IANA timezone.
 * @returns True if submission is on the consecutive next day.
 */
export function isNextDay(
  submissionTs: number,
  lastSolvedTs: number,
  timezone: string,
): boolean {
  const subDay = formatZonedDateDay(
    convertTimestampToZonedDate(submissionTs, timezone),
    timezone,
  );
  const nextDay = formatZonedDateDay(
    addDays(convertTimestampToZonedDate(lastSolvedTs, timezone), 1),
    timezone,
  );
  return subDay === nextDay;
}
