/**
 * Curated list of IANA timezones grouped by region.
 *
 * The `labelKey` points to an i18n key under `settings.timezoneZones.{labelKey}`
 * so each locale renders city names in its own language.
 *
 * If the user's detected timezone is NOT in this list we still accept + display
 * it via a dynamic "custom" option (see resolveTimezoneLabel).
 */

export type TimezoneRegionKey = 'americas' | 'europe' | 'asia' | 'oceania' | 'utc';

export interface TimezoneOption {
  /** IANA zone identifier (value stored in backend). */
  value: string;
  /** i18n key under `settings.timezoneZones`. */
  labelKey: string;
}

export interface TimezoneRegion {
  regionKey: TimezoneRegionKey;
  zones: TimezoneOption[];
}

export const TIMEZONE_REGIONS: TimezoneRegion[] = [
  {
    regionKey: 'americas',
    zones: [
      { value: 'America/Lima', labelKey: 'lima' },
      { value: 'America/Mexico_City', labelKey: 'mexicoCity' },
      { value: 'America/New_York', labelKey: 'newYork' },
      { value: 'America/Los_Angeles', labelKey: 'losAngeles' },
      { value: 'America/Chicago', labelKey: 'chicago' },
      { value: 'America/Santiago', labelKey: 'santiago' },
      { value: 'America/Argentina/Buenos_Aires', labelKey: 'buenosAires' },
      { value: 'America/Sao_Paulo', labelKey: 'saoPaulo' },
      { value: 'America/La_Paz', labelKey: 'laPaz' },
      { value: 'America/Panama', labelKey: 'panama' },
    ],
  },
  {
    regionKey: 'europe',
    zones: [
      { value: 'Europe/London', labelKey: 'london' },
      { value: 'Europe/Madrid', labelKey: 'madrid' },
      { value: 'Europe/Athens', labelKey: 'athens' },
      { value: 'Europe/Moscow', labelKey: 'moscow' },
    ],
  },
  {
    regionKey: 'asia',
    zones: [
      { value: 'Asia/Dubai', labelKey: 'dubai' },
      { value: 'Asia/Kolkata', labelKey: 'kolkata' },
      { value: 'Asia/Bangkok', labelKey: 'bangkok' },
      { value: 'Asia/Shanghai', labelKey: 'shanghai' },
      { value: 'Asia/Tokyo', labelKey: 'tokyo' },
    ],
  },
  {
    regionKey: 'oceania',
    zones: [
      { value: 'Australia/Sydney', labelKey: 'sydney' },
      { value: 'Pacific/Auckland', labelKey: 'auckland' },
    ],
  },
  {
    regionKey: 'utc',
    zones: [{ value: 'UTC', labelKey: 'utc' }],
  },
];

/** Fast lookup: IANA zone -> i18n label key (or undefined if not curated). */
const ZONE_LOOKUP: Map<string, string> = new Map(
  TIMEZONE_REGIONS.flatMap((r) => r.zones.map((z) => [z.value, z.labelKey] as const)),
);

export function isCuratedTimezone(zone: string): boolean {
  return ZONE_LOOKUP.has(zone);
}

/**
 * Returns the live UTC offset of a timezone as a string like "UTC-05:00".
 * Accounts for DST at call time. Falls back to empty string if the zone is
 * not recognized by the runtime.
 */
export function computeUtcOffset(zone: string, at: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(at);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    // Normalize "GMT-05:00" -> "UTC-05:00", "GMT" -> "UTC"
    return offset.replace(/^GMT/, 'UTC') || 'UTC';
  } catch {
    return '';
  }
}
