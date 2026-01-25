import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Logger } from '@nestjs/common';

const logger = new Logger('TimeUtils');

export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function dateToTimestamp(date: Date | null): number | null {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

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

export function getIANATimezone(utcOffset: string | null): string {
  try {
    // Si viene null o vacío, devolvemos UTC
    if (!utcOffset) {
      logger.warn('utcOffset is null or empty, defaulting to UTC');
      return 'UTC';
    }

    // Si ya está en formato IANA, devolver tal cual
    if (utcOffset.includes('/')) {
      return utcOffset;
    }

    // Map de UTC a IANA
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

export function convertTimestampToTimezoneDate(
  timestampInSeconds: number,
  timezone: string,
): string {
  const date = new Date(timestampInSeconds * 1000);
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone: timezone });
}

export function convertTimestampToZonedDate(
  timestampInSeconds: number,
  timezone: string,
): Date {
  const date = new Date(timestampInSeconds * 1000);

  return toZonedTime(date, timezone);
}

export function formatZonedDateDay(date: Date, timezone: string): string {
    return format(date, 'yyyy-MM-dd', { timeZone: timezone });
  }
