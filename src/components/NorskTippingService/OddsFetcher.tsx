import ky from 'ky';
import { NT_CONFIG } from '../../config/norsktippingConfig';
import type { NTMatch, NTOdds } from '../../interfaces/interfaces';

// NT API response types (faktisk struktur fra API)
interface NTApiResponse {
  eventList: NTApiEvent[];
}

interface NTApiEvent {
  eventId: string;
  homeParticipant: string;
  homeParticipantShortName: string;
  awayParticipant: string;
  awayParticipantShortName: string;
  eventName: string;
  sportId: string;
  startTime: string;
  tournament: {
    id: string;
    name: string;
  };
  mainMarket?: {
    marketId: string;
    marketName: string;
    selections: Array<{
      selectionId: string;
      selectionValue: 'H' | 'D' | 'A'; // Home, Draw, Away
      selectionName: string;
      selectionShortName: string;
      selectionOdds: string; // Odds er string i API
    }>;
  };
}

// Mock data for fallback/testing
const MOCK_MATCHES: NTMatch[] = [
  {
    id: 'pl-1',
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    startTime: '2025-11-20T15:00:00Z',
  },
  {
    id: 'pl-2',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    league: 'Premier League',
    startTime: '2025-11-20T17:30:00Z',
  },
  {
    id: 'pl-3',
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham',
    league: 'Premier League',
    startTime: '2025-11-21T15:00:00Z',
  },
  {
    id: 'la-1',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    league: 'La Liga',
    startTime: '2025-11-21T20:00:00Z',
  },
  {
    id: 'bun-1',
    homeTeam: 'Bayern München',
    awayTeam: 'Borussia Dortmund',
    league: 'Bundesliga',
    startTime: '2025-11-22T17:30:00Z',
  },
];

const MOCK_ODDS: Record<string, NTOdds> = {
  'pl-1': { matchId: 'pl-1', homeWin: 2.10, draw: 3.40, awayWin: 3.20 },
  'pl-2': { matchId: 'pl-2', homeWin: 2.50, draw: 3.30, awayWin: 2.80 },
  'pl-3': { matchId: 'pl-3', homeWin: 1.50, draw: 4.20, awayWin: 6.50 },
  'la-1': { matchId: 'la-1', homeWin: 2.20, draw: 3.50, awayWin: 3.00 },
  'bun-1': { matchId: 'bun-1', homeWin: 1.80, draw: 3.80, awayWin: 4.20 },
};

// Parse NT API event til vårt format
function parseNTEvent(event: NTApiEvent): NTMatch {
  return {
    id: event.eventId || '',
    homeTeam: event.homeParticipant || event.eventName || '',
    awayTeam: event.awayParticipant || '',
    league: event.tournament?.name || 'Ukjent liga',
    startTime: event.startTime || '',
  };
}

// Hent odds fra NT event
function extractOddsFromEvent(event: NTApiEvent): NTOdds | null {
  const market = event.mainMarket;
  if (!market || !market.selections || market.selections.length < 3) {
    console.warn('Event mangler mainMarket eller selections:', event.eventId);
    return null;
  }

  // Selections er i rekkefølge: H (home), D (draw), A (away)
  const homeSelection = market.selections.find(s => s.selectionValue === 'H');
  const drawSelection = market.selections.find(s => s.selectionValue === 'D');
  const awaySelection = market.selections.find(s => s.selectionValue === 'A');

  if (!homeSelection || !drawSelection || !awaySelection) {
    console.warn('Kunne ikke finne alle selections for event:', event.eventId);
    return null;
  }

  return {
    matchId: event.eventId,
    homeWin: parseFloat(homeSelection.selectionOdds),
    draw: parseFloat(drawSelection.selectionOdds),
    awayWin: parseFloat(awaySelection.selectionOdds),
  };
}

export async function searchMatches(query: string): Promise<NTMatch[]> {
  if (NT_CONFIG.useMockData) {
    // Mock: filtrer basert på søk
    const lowerQuery = query.toLowerCase();
    return MOCK_MATCHES.filter(m => 
      m.homeTeam.toLowerCase().includes(lowerQuery) ||
      m.awayTeam.toLowerCase().includes(lowerQuery) ||
      m.league.toLowerCase().includes(lowerQuery)
    );
  }

  // Hent fra NT API (åpent API, krever ikke nøkkel)
  try {
    const response = await ky.get(
      `${NT_CONFIG.apiBaseUrl}/events/${NT_CONFIG.sportId}`
    ).json<NTApiResponse>();

    console.log('NT API response:', response);

    // NT API returnerer objekt med eventList property
    const events = response.eventList || [];
    console.log('Events array:', events.length, 'events');

    // Filtrer ut events som ikke er vanlige kamper (turneringer, etc)
    const validEvents = events.filter(e => 
      e.homeParticipant && e.awayParticipant && e.mainMarket
    );
    console.log('Valid events (med begge lag):', validEvents.length);

    // Parse events til vårt format
    const allMatches = validEvents.map(parseNTEvent);

    console.log('Parsed matches:', allMatches.length);

    // Filtrer basert på søkeord (med null-sjekker)
    const lowerQuery = query.toLowerCase();
    const filtered = allMatches.filter(m => {
      if (!m.homeTeam || !m.awayTeam || !m.league) {
        return false; // Hopp over kamper med manglende data
      }
      return (
        m.homeTeam.toLowerCase().includes(lowerQuery) ||
        m.awayTeam.toLowerCase().includes(lowerQuery) ||
        m.league.toLowerCase().includes(lowerQuery)
      );
    });

    console.log('Filtered matches:', filtered.length, 'treff for:', query);
    return filtered;
  } catch (error) {
    console.error('Feil ved henting av kamper fra NT API:', error);
    throw error;
  }
}

export async function getMatchOdds(matchId: string): Promise<NTOdds | null> {
  if (NT_CONFIG.useMockData) {
    return MOCK_ODDS[matchId] || null;
  }

  // Hent odds fra NT API
  // Vi må først hente hele event-listen og finne riktig match
  try {
    const response = await ky.get(
      `${NT_CONFIG.apiBaseUrl}/events/${NT_CONFIG.sportId}`
    ).json<NTApiResponse>();

    console.log('Henter odds for matchId:', matchId);

    // Hent events array fra response
    const events = response.eventList || [];

    // Finn riktig event
    const event = events.find(e => e.eventId === matchId);
    if (!event) {
      console.error(`Match med ID ${matchId} ikke funnet i API response`);
      return null;
    }

    console.log('Fant event:', event);

    // Ekstraher odds
    const odds = extractOddsFromEvent(event);
    if (!odds) {
      console.error(`Kunne ikke ekstrahera odds for match ${matchId}`, event);
      return null;
    }

    console.log('Ekstraherte odds:', odds);
    return odds;
  } catch (error) {
    console.error('Feil ved henting av odds fra NT API:', error);
    throw error;
  }
}

