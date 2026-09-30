(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const occasions = ['Anniversaire', 'Mariage', 'Félicitations', 'Merci', 'Pour elle', 'Pour lui', 'Couple', 'Famille', 'Naissance', 'Fêtes', 'Autre'];
  // Editorial category recommendations, never purchase/popularity claims.
  const suggestions = { Mariage: ['maison', 'voyage', 'restaurant', 'experience'], Naissance: ['maison', 'mode'], Couple: ['restaurant', 'voyage', 'bien-etre', 'experience'], Famille: ['loisir', 'restaurant', 'voyage'], Enfant: ['loisir', 'sport', 'technologie'] };
  function matches(m, filters) {
    const words = [m.businessName, m.name, m.description, m.activityCategory, m.city, ...(m.keywords || []), ...(m.locations || []).flatMap(l => [l.name, l.city, l.address])].join(' ');
    if (filters.query && !normalize(words).includes(normalize(filters.query))) return false;
    if (filters.city && !normalize([m.city, ...(m.locations || []).map(l => l.city)].join(' ')).includes(normalize(filters.city))) return false;
    if (filters.category && m.activityCategory !== filters.category) return false;
    const occasion = filters.occasion;
    if (occasion && suggestions[occasion] && !(m.occasions || []).includes(occasion) && !suggestions[occasion].some(c => normalize(m.activityCategory).includes(c))) return false;
    if (filters.budget) {
      const [min, max] = filters.budget.split(':').map(Number);
      const presets = (m.presetAmounts || []).map(Number);
      if (!presets.some(n => n >= min && n < max) && !(m.freeAmountEnabled && Number(m.freeAmountMax) >= min && Number(m.freeAmountMin) < max)) return false;
    }
    return true;
  }
  function distance(a, b) {
    if (![a.latitude, a.longitude, b.latitude, b.longitude].every(n => typeof n === 'number' && Number.isFinite(n))) return null;
    const rad = x => x * Math.PI / 180;
    const v = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, v)), Math.sqrt(Math.max(0, 1 - v)));
  }
  root.KADOSK_DISCOVERY = { normalize, occasions, matches, distance };
}(typeof window !== 'undefined' ? window : globalThis));
