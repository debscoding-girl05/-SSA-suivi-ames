// ISO-8601 week number helpers (Monday-based weeks).

function isoWeek(input = new Date()) {
  const d = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
  return { year: d.getUTCFullYear(), week };
}

function currentWeek() {
  return isoWeek(new Date());
}

// Parse { year, week } from a query/body, validating ranges; falls back to the
// current week on missing/out-of-range values.
function parseWeek(source = {}) {
  const year = Number(source.year);
  const week = Number(source.week);
  if (
    Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(week) && week >= 1 && week <= 53
  ) {
    return { year, week };
  }
  return currentWeek();
}

module.exports = { isoWeek, currentWeek, parseWeek };
