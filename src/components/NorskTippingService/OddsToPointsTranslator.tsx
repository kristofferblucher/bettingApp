import { oddsToPoints, formatPointsLabel } from '../../utils/oddsConverter';
import type { NTOdds } from '../../interfaces/interfaces';

/**
 * Konverterer NT odds til poeng-objekter
 */
export function translateOddsToPoints(odds: NTOdds) {
  return {
    homeWin: oddsToPoints(odds.homeWin),
    draw: oddsToPoints(odds.draw),
    awayWin: oddsToPoints(odds.awayWin),
  };
}

/**
 * Lager alternativer med poeng-labels
 */
export function createOptionsWithPoints(
  homeTeam: string,
  awayTeam: string,
  points: { homeWin: number; draw: number; awayWin: number }
): string[] {
  return [
    `${homeTeam} (${formatPointsLabel(points.homeWin)})`,
    `Uavgjort (${formatPointsLabel(points.draw)})`,
    `${awayTeam} (${formatPointsLabel(points.awayWin)})`,
  ];
}

/**
 * Lager poeng-array i samme rekkefølge som alternativer
 */
export function createPointsArray(points: { homeWin: number; draw: number; awayWin: number }): number[] {
  return [points.homeWin, points.draw, points.awayWin];
}

