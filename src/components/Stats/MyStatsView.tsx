import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
  Spinner,
  Center,
  Button,
  useToast,
} from "@chakra-ui/react";
import { supabase } from "../../database/supabaseClient";
import { getDeviceId } from "../../utils/deviceUtils";
import { aggregatePlayerStats } from "../../utils/statsUtils";

export default function MyStatsView() {
  const [stats, setStats] = useState({
    totalPlayed: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    avgScore: 0,
    wins: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const deviceId = getDeviceId();
  const toast = useToast();

  useEffect(() => {
    fetchMyStats();
  }, []);

  const fetchMyStats = async (showToast = false) => {
    try {
      setIsLoading(true);

      // Hent mine submissions
      const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("*")
        .eq("device_id", deviceId);

      if (subError) throw subError;

      if (!submissions || submissions.length === 0) {
        setIsLoading(false);
        return;
      }

      // Hent alle spørsmål
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("*");

      if (qError) throw qError;

      // Hent alle resultater
      const { data: results, error: rError } = await supabase
        .from("results")
        .select("*");

      if (rError) throw rError;

      // Beregn min statistikk
      const myStats = aggregatePlayerStats(
        submissions,
        questions || [],
        results || []
      );

      setStats(myStats);
      setIsLoading(false);

      if (showToast) {
        toast({
          title: "Statistikk oppdatert!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error("Feil ved henting av min statistikk:", err);
      setIsLoading(false);

      if (showToast) {
        toast({
          title: "Feil ved oppdatering",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Center p={10}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">Laster din statistikk...</Text>
        </VStack>
      </Center>
    );
  }

  if (stats.totalPlayed === 0) {
    return (
      <Box p={6}>
        <Card>
          <CardBody>
            <Center p={10}>
              <VStack spacing={4}>
                <Heading size="md" color="gray.500">
                  Ingen statistikk enda
                </Heading>
                <Text color="gray.500" textAlign="center">
                  Du har ikke levert noen kuponger enda.
                  <br />
                  Gå til "Kupong" for å delta!
                </Text>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={6} bg="gray.50">
      <VStack spacing={6} align="stretch">
        <Heading size="lg" textAlign="center">
          📊 Min statistikk
        </Heading>

        <Button
          colorScheme="blue"
          onClick={() => fetchMyStats(true)}
          isLoading={isLoading}
          alignSelf="center"
        >
          🔄 Oppdater statistikk
        </Button>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {/* Kuponger deltatt */}
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Kuponger deltatt</StatLabel>
                <StatNumber color="blue.500">{stats.totalPlayed}</StatNumber>
                <StatHelpText>Totalt antall kuponger</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Riktige svar */}
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Riktige svar</StatLabel>
                <StatNumber color="green.500">
                  {stats.totalCorrect} / {stats.totalQuestions}
                </StatNumber>
                <StatHelpText>Totalt antall riktige</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Gjennomsnittlig score */}
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Gjennomsnittlig score</StatLabel>
                <StatNumber
                  color={
                    stats.avgScore >= 70
                      ? "green.500"
                      : stats.avgScore >= 50
                      ? "yellow.500"
                      : "red.500"
                  }
                >
                  {stats.avgScore.toFixed(1)}%
                </StatNumber>
                <StatHelpText>Gjennom alle kuponger</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Antall seire */}
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Antall seire</StatLabel>
                <StatNumber color="purple.500">
                  🏆 {stats.wins}
                </StatNumber>
                <StatHelpText>Kuponger med best score</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Ekstra info */}
        <Card>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Heading size="md">Om din statistikk</Heading>
              <Text color="gray.600">
                Din statistikk beregnes basert på alle kupongene du har deltatt på.
              </Text>
              <Text color="gray.600">
                En seier telles når du har flest riktige svar på en kupong.
                Hvis flere spillere deler best score, teller det som seier for alle.
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

