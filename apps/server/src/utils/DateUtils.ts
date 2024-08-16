export function getNextDayTimestampInSec(): number {
  const duration = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
  return Math.trunc((Date.now() + duration) / 1000); // ms to sec
}
