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
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  HStack,
} from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
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
  
  // Modal for generell info
  const { isOpen: isGeneralOpen, onOpen: onGeneralOpen, onClose: onGeneralClose } = useDisclosure();
  
  // Modaler for individuelle stats
  const { isOpen: isWinsOpen, onOpen: onWinsOpen, onClose: onWinsClose } = useDisclosure();
  const { isOpen: isCorrectOpen, onOpen: onCorrectOpen, onClose: onCorrectClose } = useDisclosure();
  const { isOpen: isAvgOpen, onOpen: onAvgOpen, onClose: onAvgClose } = useDisclosure();

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
      <Box p={2}>
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
    <Box p={2} bg="gray.50">
      <VStack spacing={6} align="stretch">
        <HStack justify="center" align="center" spacing={3}>
          <Heading size="lg">📊 Min statistikk</Heading>
          <IconButton
            aria-label="Info om min statistikk"
            icon={<InfoIcon />}
            size="sm"
            colorScheme="blue"
            variant="ghost"
            onClick={onGeneralOpen}
          />
        </HStack>

        <Button
          colorScheme="blue"
          onClick={() => fetchMyStats(true)}
          isLoading={isLoading}
          alignSelf="center"
        >
          🔄 Oppdater statistikk
        </Button>

        {/* Store fremhevede cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Antall seire - stor card */}
          <Card bg="purple.50" borderWidth="2px" borderColor="purple.200" shadow="lg">
            <CardBody textAlign="center" py={8}>
              <VStack spacing={3}>
                <HStack spacing={2} justify="center">
                  <Text fontSize="lg" fontWeight="medium" color="gray.600">
                    Antall seire
                  </Text>
                  <IconButton
                    aria-label="Info om antall seire"
                    icon={<InfoIcon />}
                    size="xs"
                    colorScheme="purple"
                    variant="ghost"
                    onClick={onWinsOpen}
                  />
                </HStack>
                <Text fontSize="6xl" fontWeight="bold" color="purple.600">
                  🏆 {stats.wins}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Kuponger med best score
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Riktige svar - stor card */}
          <Card bg="green.50" borderWidth="2px" borderColor="green.200" shadow="lg">
            <CardBody textAlign="center" py={8}>
              <VStack spacing={3}>
                <HStack spacing={2} justify="center">
                  <Text fontSize="lg" fontWeight="medium" color="gray.600">
                    Riktige svar
                  </Text>
                  <IconButton
                    aria-label="Info om riktige svar"
                    icon={<InfoIcon />}
                    size="xs"
                    colorScheme="green"
                    variant="ghost"
                    onClick={onCorrectOpen}
                  />
                </HStack>
                <Text fontSize="6xl" fontWeight="bold" color="green.600">
                  {stats.totalCorrect}
                </Text>
                <Text fontSize="md" color="gray.600" fontWeight="medium">
                  av {stats.totalQuestions} spørsmål
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Totalt på tvers av alle kuponger
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Mindre detalj-cards */}
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

          {/* Gjennomsnittlig score */}
          <Card>
            <CardBody>
              <Stat>
                <HStack spacing={2}>
                  <StatLabel>Gjennomsnittlig score</StatLabel>
                  <IconButton
                    aria-label="Info om gjennomsnittlig score"
                    icon={<InfoIcon />}
                    size="xs"
                    colorScheme="blue"
                    variant="ghost"
                    onClick={onAvgOpen}
                  />
                </HStack>
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

        </SimpleGrid>
      </VStack>

      {/* Generell Info Modal */}
      <Modal isOpen={isGeneralOpen} onClose={onGeneralClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Om din statistikk</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Din statistikk beregnes basert på alle kupongene du har deltatt på.
              </Text>

              <Text color="gray.500" fontSize="xs" fontStyle="italic">
                Tips: Klikk på info-knappen (ⓘ) ved hver statistikk for å lære mer om
                hvordan den beregnes.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Antall seire */}
      <Modal isOpen={isWinsOpen} onClose={onWinsClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🏆 Antall seire</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                En seier telles når du har flest riktige svar på en kupong
                sammenlignet med alle andre spillere.
              </Text>

              <Text color="gray.600" fontSize="sm">
                <strong>Hva skjer ved lik score?</strong>
                <br />
                Hvis flere spillere deler best score, teller det som seier for alle.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Riktige svar */}
      <Modal isOpen={isCorrectOpen} onClose={onCorrectClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>✅ Riktige svar</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Totalt antall riktige svar på tvers av alle kuponger du har deltatt på,
                sammenlignet med totalt antall spørsmål du har besvart.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Gjennomsnittlig score */}
      <Modal isOpen={isAvgOpen} onClose={onAvgClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📊 Gjennomsnittlig score</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Viser din gjennomsnittlige prestasjonen på tvers av alle kuponger.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

