/**
 * Returns today's date as a YYYYMMDD number (e.g. 20260216).
 * @returns {number}
 */
export function getTodayAsNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return Number(`${yyyy}${mm}${dd}`);
}
