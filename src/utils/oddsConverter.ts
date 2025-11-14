/**
 * Konverterer odds til poeng logaritmisk
 * Lav odds (favoritt) = færre poeng
 * Høy odds (underdog) = flere poeng
 * 
 * Formel: poeng = basePoeng + log(odds) * multiplier
 * 
 * Avrunding:
 * - 10.5 eller under: rund ned
 * - Over 10.5: rund opp
 * 
 * Eksempler:
 * - Odds 1.20 (sterk favoritt) → 1 poeng
 * - Odds 2.00 (jevnt) → 3 poeng  
 * - Odds 5.00 (underdog) → 6 poeng
 * - Odds 10.00 (stor underdog) → 7 poeng
 */
export function oddsToPoints(odds: number): number {
  const basePoints = 1;
  const multiplier = 3;
  const points = basePoints + Math.log(odds) * multiplier;
  
  // Rund ned hvis 10.5 eller under, ellers rund opp
  if (points <= 10.5) {
    return Math.floor(points);
  } else {
    return Math.ceil(points);
  }
}

/**
 * Formatterer poeng for visning ved siden av alternativ
 * Eksempel: formatPointsLabel(5) → "5p"
 */
export function formatPointsLabel(points: number): string {
  return `${Math.round(points)}p`;
}

