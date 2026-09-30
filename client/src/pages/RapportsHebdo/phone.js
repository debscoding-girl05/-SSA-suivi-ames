// Téléphone saisi sur les fiches : chiffres et espaces, un « + » initial
// (+237…) et une précision entre parenthèses (« 690 60 77 13 (parent) »).
export const phoneHasInvalid = (v) =>
  /[^0-9\s]/.test(String(v || '').replace(/\([^)]*\)/g, '').replace(/^\s*\+/, ''));
