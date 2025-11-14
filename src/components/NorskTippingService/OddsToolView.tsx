import { useState } from 'react';
import {
  Box, Button, Input, VStack, HStack, Text, Card,
  CardBody, Heading, useToast
} from '@chakra-ui/react';
import { searchMatches, getMatchOdds } from './OddsFetcher';
import { translateOddsToPoints, createOptionsWithPoints, createPointsArray } from './OddsToPointsTranslator';
import type { NTMatch } from '../../interfaces/interfaces';
import { supabase } from '../../database/supabaseClient';

interface OddsToolViewProps {
  couponId: number;
  onQuestionAdded: () => void;
  onClose: () => void;
}

export default function OddsToolView({ couponId, onQuestionAdded, onClose }: OddsToolViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<NTMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingMatchId, setAddingMatchId] = useState<string | null>(null);
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Skriv inn søkeord',
        description: 'F.eks. "Premier League", "Manchester", "Real Madrid"',
        status: 'warning',
        duration: 2500,
      });
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchMatches(searchQuery);
      setMatches(results);

      if (results.length === 0) {
        toast({
          title: 'Ingen kamper funnet',
          description: 'Prøv et annet søk (f.eks. "Premier League", "Manchester")',
          status: 'info',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Feil ved søk:', error);
      toast({
        title: 'Kunne ikke hente kamper fra NT API',
        description: 'Sjekk console for detaljer',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setMatches([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addMatchAsQuestion = async (match: NTMatch) => {
    setAddingMatchId(match.id);

    // Hent odds for kampen
    const odds = await getMatchOdds(match.id);
    if (!odds) {
      toast({
        title: 'Kunne ikke hente odds',
        description: 'Prøv igjen eller velg en annen kamp',
        status: 'error',
        duration: 3000,
      });
      setAddingMatchId(null);
      return;
    }

    // Konverter odds til poeng
    const points = translateOddsToPoints(odds);

    // Lag spørsmålstekst
    const questionText = `${match.homeTeam} vs ${match.awayTeam}`;
    
    // Alternativer med poeng
    const options = createOptionsWithPoints(match.homeTeam, match.awayTeam, points);
    const optionPoints = createPointsArray(points);

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
      setAddingMatchId(null);
      return;
    }

    toast({
      title: 'Spørsmål lagt til!',
      description: `${match.homeTeam} vs ${match.awayTeam}`,
      status: 'success',
      duration: 2000,
    });

    setAddingMatchId(null);
    onQuestionAdded();
  };

  return (
    <Box p={4} bg="blue.50" borderRadius="md" shadow="sm">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">⚽ NT Verktøy</Heading>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Lukk
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {/* Søkefelt */}
        <HStack>
          <Input
            placeholder="Søk etter liga eller lag (f.eks. 'Premier League', 'Real Madrid')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            bg="white"
          />
          <Button 
            colorScheme="blue" 
            onClick={handleSearch} 
            isLoading={isSearching}
            minW="100px"
          >
            Søk
          </Button>
        </HStack>

        {/* Søkeresultater */}
        {matches.length > 0 && (
          <VStack spacing={2} align="stretch">
            <Text fontWeight="bold" fontSize="sm" color="gray.600">
              {matches.length} kamp{matches.length !== 1 ? 'er' : ''} funnet:
            </Text>
            {matches.map((match) => (
              <Card key={match.id} size="sm" variant="outline" bg="white">
                <CardBody>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex="1">
                      <Text fontWeight="bold" fontSize="md">
                        {match.homeTeam} vs {match.awayTeam}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {match.league}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(match.startTime).toLocaleDateString('no-NO', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </VStack>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => addMatchAsQuestion(match)}
                      isLoading={addingMatchId === match.id}
                      loadingText="Legger til..."
                    >
                      Legg til
                    </Button>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}

        {/* Tom tilstand */}
        {matches.length === 0 && !isSearching && searchQuery && (
          <Box textAlign="center" py={4}>
            <Text color="gray.500" fontSize="sm">
              Ingen kamper funnet. Prøv et annet søk.
            </Text>
          </Box>
        )}

        {/* Hjelpetekst */}
        {matches.length === 0 && !searchQuery && (
          <Box textAlign="center" py={6}>
            <Text color="gray.500" fontSize="sm" mb={2}>
              Søk etter kamper fra Norsk Tipping
            </Text>
            <Text color="gray.400" fontSize="xs">
              Poeng beregnes automatisk basert på odds
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

