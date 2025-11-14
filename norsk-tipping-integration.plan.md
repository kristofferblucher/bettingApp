# Norsk Tipping API Integration - Phase 2

## Mål

Integrere Norsk Tipping API for å automatisk hente kamper og odds, konvertere til poeng, og vise som alternativer i kuponger.

---

## 1. Setup og Dependencies

### Installer ky HTTP-klient

```bash
npm install ky
```

### Opprett API-konfigurasjon

Fil: `src/config/norsktippingConfig.ts`

```typescript
export const NT_CONFIG = {
  // NT API endpoint (kan være offisielt API eller tredjepartsløsning)
  apiBaseUrl: 'https://www.norsk-tipping.no/api', // Placeholder
  
  // For prototype: Mock data mens vi finner riktig API
  useMockData: true,
};
```

---

## 2. Odds → Poeng Konvertering (Logaritmisk)

### Opprett `src/utils/oddsConverter.ts`

Logaritmisk formel som flater ut ekstreme odds:

```typescript
/**
 * Konverterer odds til poeng logaritmisk
 * Lav odds (favoritt) = færre poeng
 * Høy odds (underdog) = flere poeng
 * 
 * Formel: poeng = basePoeng + log(odds) * multiplier
 * 
 * Eksempler:
 * - Odds 1.20 (sterk favoritt) → 1.2 poeng
 * - Odds 2.00 (jevnt) → 3.0 poeng  
 * - Odds 5.00 (underdog) → 5.7 poeng
 * - Odds 10.00 (stor underdog) → 7.3 poeng
 */
export function oddsToPoints(odds: number): number {
  const basePoints = 1;
  const multiplier = 3;
  const points = basePoints + Math.log(odds) * multiplier;
  return Math.round(points * 10) / 10; // Rund til 1 desimal
}

/**
 * Formatterer poeng for visning ved siden av alternativ
 * Eksempel: formatPointsLabel(5.7) → "5.7p"
 */
export function formatPointsLabel(points: number): string {
  return `${points}p`;
}
```

---

## 3. NT Data Types og Interfaces

### Oppdater `src/interfaces/interfaces.tsx`

Legg til typer for NT-data:

```typescript
// NT Match data
export interface NTMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
}

// NT Odds for en kamp
export interface NTOdds {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
}

// Kombinert match med odds og poeng
export interface NTMatchWithPoints {
  match: NTMatch;
  odds: NTOdds;
  points: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

// Oppdater Question til å støtte NT-spørsmål
export interface Question {
  id: number;
  text: string;
  options: string[];
  coupon_id?: number;
  nt_match_id?: string;  // Ny: kobler til NT match hvis det er NT-spørsmål
  option_points?: number[];  // Ny: poeng per alternativ
}
```

---

## 4. NT API Service

### Opprett `src/services/norsktippingService.ts`

Service for å hente data fra NT API:

```typescript
import ky from 'ky';
import { NT_CONFIG } from '../config/norsktippingConfig';
import type { NTMatch, NTOdds } from '../interfaces/interfaces';

// Mock data for prototype
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
];

const MOCK_ODDS: Record<string, NTOdds> = {
  'pl-1': { matchId: 'pl-1', homeWin: 2.10, draw: 3.40, awayWin: 3.20 },
  'pl-2': { matchId: 'pl-2', homeWin: 2.50, draw: 3.30, awayWin: 2.80 },
};

export async function searchMatches(query: string): Promise<NTMatch[]> {
  if (NT_CONFIG.useMockData) {
    // Mock: filtrer basert på søk
    return MOCK_MATCHES.filter(m => 
      m.homeTeam.toLowerCase().includes(query.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(query.toLowerCase()) ||
      m.league.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Ekte API-kall når klart
  try {
    const matches = await ky.get(`${NT_CONFIG.apiBaseUrl}/matches`, {
      searchParams: { q: query }
    }).json<NTMatch[]>();
    return matches;
  } catch (error) {
    console.error('Feil ved henting av kamper:', error);
    return [];
  }
}

export async function getMatchOdds(matchId: string): Promise<NTOdds | null> {
  if (NT_CONFIG.useMockData) {
    return MOCK_ODDS[matchId] || null;
  }

  // Ekte API-kall når klart
  try {
    const odds = await ky.get(`${NT_CONFIG.apiBaseUrl}/odds/${matchId}`).json<NTOdds>();
    return odds;
  } catch (error) {
    console.error('Feil ved henting av odds:', error);
    return null;
  }
}
```

---

## 5. NT Tool Component

### Opprett `src/components/Admin/NTTool.tsx`

Verktøy for å søke etter kamper og legge til som spørsmål:

```typescript
import { useState } from 'react';
import {
  Box, Button, Input, VStack, HStack, Text, Card,
  CardBody, Heading, useToast, Spinner
} from '@chakra-ui/react';
import { searchMatches, getMatchOdds } from '../../services/norsktippingService';
import { oddsToPoints, formatPointsLabel } from '../../utils/oddsConverter';
import type { NTMatch, NTMatchWithPoints } from '../../interfaces/interfaces';
import { supabase } from '../../database/supabaseClient';

interface NTToolProps {
  couponId: number;
  onQuestionAdded: () => void;
  onClose: () => void;
}

export default function NTTool({ couponId, onQuestionAdded, onClose }: NTToolProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<NTMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await searchMatches(searchQuery);
    setMatches(results);
    setIsSearching(false);

    if (results.length === 0) {
      toast({
        title: 'Ingen kamper funnet',
        description: 'Prøv et annet søk (f.eks. "Premier League", "Manchester")',
        status: 'info',
        duration: 3000,
      });
    }
  };

  const addMatchAsQuestion = async (match: NTMatch) => {
    // Hent odds for kampen
    const odds = await getMatchOdds(match.id);
    if (!odds) {
      toast({
        title: 'Kunne ikke hente odds',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Beregn poeng
    const points = {
      homeWin: oddsToPoints(odds.homeWin),
      draw: oddsToPoints(odds.draw),
      awayWin: oddsToPoints(odds.awayWin),
    };

    // Lag spørsmålstekst
    const questionText = `${match.homeTeam} vs ${match.awayTeam}`;
    
    // Alternativer med poeng
    const options = [
      `${match.homeTeam} (${formatPointsLabel(points.homeWin)})`,
      `Uavgjort (${formatPointsLabel(points.draw)})`,
      `${match.awayTeam} (${formatPointsLabel(points.awayWin)})`,
    ];

    const optionPoints = [points.homeWin, points.draw, points.awayWin];

    // Lagre i database
    const { error } = await supabase
      .from('questions')
      .insert([{
        coupon_id: couponId,
        text: questionText,
        options: options,
        nt_match_id: match.id,
        option_points: optionPoints,
      }]);

    if (error) {
      toast({
        title: 'Kunne ikke legge til spørsmål',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    toast({
      title: 'Spørsmål lagt til!',
      status: 'success',
      duration: 2000,
    });

    onQuestionAdded();
    onClose();
  };

  return (
    <Box p={4} bg="blue.50" borderRadius="md">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">NT Verktøy</Heading>
        <Button size="sm" onClick={onClose}>Lukk</Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        <HStack>
          <Input
            placeholder="Søk etter liga eller lag (f.eks. 'Premier League')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button colorScheme="blue" onClick={handleSearch} isLoading={isSearching}>
            Søk
          </Button>
        </HStack>

        {isSearching && <Spinner />}

        {matches.length > 0 && (
          <VStack spacing={2} align="stretch">
            <Text fontWeight="bold">Kamper funnet:</Text>
            {matches.map((match) => (
              <Card key={match.id} size="sm">
                <CardBody>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">
                        {match.homeTeam} vs {match.awayTeam}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {match.league} • {new Date(match.startTime).toLocaleDateString('no')}
                      </Text>
                    </VStack>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => addMatchAsQuestion(match)}
                    >
                      Legg til
                    </Button>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
```

---

## 6. Database Migration

### Oppdater questions tabell

Fil: `add_nt_fields_to_questions.sql`

```sql
-- Legg til felter for NT-integrasjon
ALTER TABLE questions 
  ADD COLUMN nt_match_id text,
  ADD COLUMN option_points numeric[];

-- Index for NT match ID
CREATE INDEX idx_questions_nt_match_id ON questions(nt_match_id);
```

---

## 7. Integrer NT Tool i AdminView

### Modifiser `src/components/Admin/AdminView.tsx`

Legg til knapp for NT-verktøy over "Legg inn fasit":

```typescript
import NTTool from './NTTool';

// I komponenten:
const [showNTTool, setShowNTTool] = useState(false);

// I JSX, rett over "Legg inn fasit" heading:
<Box flex="1" p={4} minW={{ base: "100%", md: "50%" }}>
  {showNTTool ? (
    <NTTool 
      couponId={coupon.id} 
      onQuestionAdded={reloadQuestions}
      onClose={() => setShowNTTool(false)}
    />
  ) : (
    <>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Legg inn fasit</Heading>
        <Button 
          size="sm" 
          colorScheme="blue" 
          onClick={() => setShowNTTool(true)}
        >
          Bruk NT Verktøy
        </Button>
      </HStack>
      
      {/* Eksisterende fasit-UI her */}
    </>
  )}
</Box>
```

---

## 8. Vise Poeng i Brukervisning

### Oppdater `src/components/User/ActiveCouponView.tsx`

Vis poeng ved siden av alternativer hvis tilgjengelig:

```typescript
// I render av alternativer:
{q.options.map((opt, idx) => {
  const pointsLabel = q.option_points?.[idx] 
    ? ` (${formatPointsLabel(q.option_points[idx])})` 
    : '';
  
  return (
    <Radio key={opt} value={opt}>
      {opt}{pointsLabel}
    </Radio>
  );
})}
```

---

## Implementeringsrekkefølge

1. Installer ky
2. Opprett config, utils (oddsConverter), interfaces
3. Opprett norsktippingService med mock data
4. Lag NTTool komponent
5. Kjør database migration
6. Integrer NTTool i AdminView
7. Oppdater brukervisning til å vise poeng
8. Test fullstendig flyt med mock data
9. Bytt til ekte NT API når tilgjengelig (sett useMockData: false)

