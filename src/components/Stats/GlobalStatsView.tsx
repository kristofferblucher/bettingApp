import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Badge,
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
import { getAllPlayersStats } from "../../utils/statsUtils";

interface PlayerStat {
  name: string;
  totalPlayed: number;
  totalCorrect: number;
  totalQuestions: number;
  avgScore: number;
  wins: number;
}

export default function GlobalStatsView() {
  const [playersStats, setPlayersStats] = useState<PlayerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  
  // Modal for generell info
  const { isOpen: isGeneralOpen, onOpen: onGeneralOpen, onClose: onGeneralClose } = useDisclosure();
  
  // Modaler for hvert leaderboard
  const { isOpen: isWinsOpen, onOpen: onWinsOpen, onClose: onWinsClose } = useDisclosure();
  const { isOpen: isAvgOpen, onOpen: onAvgOpen, onClose: onAvgClose } = useDisclosure();
  const { isOpen: isCorrectOpen, onOpen: onCorrectOpen, onClose: onCorrectClose } = useDisclosure();

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async (showToast = false) => {
    try {
      setIsLoading(true);
      const stats = await getAllPlayersStats();
      
      // Ikke sorter her, vi sorterer individuelt for hver tabell
      setPlayersStats(stats);
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
      console.error("Feil ved henting av global statistikk:", err);
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
          <Text color="gray.500">Laster spillstatistikk...</Text>
        </VStack>
      </Center>
    );
  }

  if (playersStats.length === 0) {
    return (
      <Box p={6}>
        <Card>
          <CardBody>
            <Center p={10}>
              <VStack spacing={4}>
                <Heading size="md" color="gray.500">
                  Ingen spillere enda
                </Heading>
                <Text color="gray.500" textAlign="center">
                  Ingen har levert kuponger enda.
                </Text>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      </Box>
    );
  }

  // Lag tre forskjellige leaderboards med forskjellig sortering
  const topByWins = [...playersStats]
    .filter((p) => p.wins > 0) // Vis bare spillere med minst 1 seier
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  const topByAvgScore = [...playersStats]
    .filter((p) => p.totalPlayed > 0) // Sikre at de har deltatt
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  const topByTotalCorrect = [...playersStats]
    .filter((p) => p.totalCorrect > 0) // Vis bare spillere med minst 1 riktig
    .sort((a, b) => b.totalCorrect - a.totalCorrect)
    .slice(0, 10);

  return (
    <Box p={6} bg="gray.50">
      <VStack spacing={6} align="stretch">
        <HStack justify="center" align="center" spacing={3}>
          <Heading size="lg">🏆 Spillstatistikk</Heading>
          <IconButton
            aria-label="Info om spillstatistikk"
            icon={<InfoIcon />}
            size="sm"
            colorScheme="blue"
            variant="ghost"
            onClick={onGeneralOpen}
          />
        </HStack>

        <Button
          colorScheme="blue"
          onClick={() => fetchGlobalStats(true)}
          isLoading={isLoading}
          alignSelf="center"
        >
          🔄 Oppdater statistikk
        </Button>

        {/* Leaderboard 1: Flest seire */}
        <Card>
          <CardHeader>
            <HStack spacing={2} align="center">
              <Heading size="md">🏆 Topp 10 - Flest seire</Heading>
              <IconButton
                aria-label="Info om flest seire"
                icon={<InfoIcon />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                onClick={onWinsOpen}
              />
            </HStack>
          </CardHeader>
          <CardBody>
            {topByWins.length === 0 ? (
              <Text color="gray.500">Ingen seire registrert enda.</Text>
            ) : (
              <TableContainer>
                <Table variant="simple" size="md">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th>Plassering</Th>
                      <Th>Spiller</Th>
                      <Th>Seire</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topByWins.map((player, index) => {
                      const isTopThree = index < 3;
                      const medalEmoji =
                        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

                      return (
                        <Tr
                          key={player.name}
                          bg={
                            index === 0
                              ? "yellow.50"
                              : index === 1
                              ? "gray.50"
                              : index === 2
                              ? "orange.50"
                              : undefined
                          }
                          fontWeight={isTopThree ? "bold" : "normal"}
                        >
                          <Td>
                            <Text fontSize="lg">
                              {medalEmoji} {index + 1}.
                            </Text>
                          </Td>
                          <Td>
                            <Text isTruncated maxW="300px" title={player.name}>
                              {player.name.length > 30
                                ? `${player.name.slice(0, 25)}...`
                                : player.name}
                            </Text>
                          </Td>
                          <Td>
                            <Badge colorScheme="purple" fontSize="lg">
                              🏆 {player.wins}
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        {/* Leaderboard 2: Best gjennomsnitt */}
        <Card>
          <CardHeader>
            <HStack spacing={2} align="center">
              <Heading size="md">📊 Topp 10 - Høyeste treffprosent (%)</Heading>
              <IconButton
                aria-label="Info om seiersprosent"
                icon={<InfoIcon />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                onClick={onAvgOpen}
              />
            </HStack>
          </CardHeader>
          <CardBody>
            {topByAvgScore.length === 0 ? (
              <Text color="gray.500">Ingen spillere enda.</Text>
            ) : (
              <TableContainer>
                <Table variant="simple" size="md">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th>Plassering</Th>
                      <Th>Spiller</Th>
                      <Th>Gjennomsnitt</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topByAvgScore.map((player, index) => {
                      const isTopThree = index < 3;
                      const medalEmoji =
                        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

                      return (
                        <Tr
                          key={player.name}
                          bg={
                            index === 0
                              ? "yellow.50"
                              : index === 1
                              ? "gray.50"
                              : index === 2
                              ? "orange.50"
                              : undefined
                          }
                          fontWeight={isTopThree ? "bold" : "normal"}
                        >
                          <Td>
                            <Text fontSize="lg">
                              {medalEmoji} {index + 1}.
                            </Text>
                          </Td>
                          <Td>
                            <Text isTruncated maxW="300px" title={player.name}>
                              {player.name.length > 30
                                ? `${player.name.slice(0, 25)}...`
                                : player.name}
                            </Text>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={
                                player.avgScore >= 70
                                  ? "green"
                                  : player.avgScore >= 50
                                  ? "yellow"
                                  : "red"
                              }
                              fontSize="lg"
                            >
                              {player.avgScore.toFixed(1)}%
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        {/* Leaderboard 3: Flest riktige svar totalt */}
        <Card>
          <CardHeader>
            <HStack spacing={2} align="center">
              <Heading size="md">✅ Topp 10 - Flest riktige svar</Heading>
              <IconButton
                aria-label="Info om flest riktige svar"
                icon={<InfoIcon />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                onClick={onCorrectOpen}
              />
            </HStack>
          </CardHeader>
          <CardBody>
            {topByTotalCorrect.length === 0 ? (
              <Text color="gray.500">Ingen riktige svar enda.</Text>
            ) : (
              <TableContainer>
                <Table variant="simple" size="md">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th>Plassering</Th>
                      <Th>Spiller</Th>
                      <Th>Riktige svar</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topByTotalCorrect.map((player, index) => {
                      const isTopThree = index < 3;
                      const medalEmoji =
                        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

                      return (
                        <Tr
                          key={player.name}
                          bg={
                            index === 0
                              ? "yellow.50"
                              : index === 1
                              ? "gray.50"
                              : index === 2
                              ? "orange.50"
                              : undefined
                          }
                          fontWeight={isTopThree ? "bold" : "normal"}
                        >
                          <Td>
                            <Text fontSize="lg">
                              {medalEmoji} {index + 1}.
                            </Text>
                          </Td>
                          <Td>
                            <Text isTruncated maxW="300px" title={player.name}>
                              {player.name.length > 30
                                ? `${player.name.slice(0, 25)}...`
                                : player.name}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontWeight="semibold" color="green.600" fontSize="lg">
                              {player.totalCorrect} / {player.totalQuestions}
                            </Text>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

      </VStack>

      {/* Generell Info Modal */}
      <Modal isOpen={isGeneralOpen} onClose={onGeneralClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Om spillstatistikken</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Spillstatistikk-siden viser flere forskjellige leaderboards som rangerer
                spillere basert på ulike kriterier. Det vil komme flere statistikker etterhvert.
              </Text>
      

              <Box pt={3} borderTopWidth="1px">
                <Text color="gray.600" fontSize="sm" fontWeight="medium">
                  Totalt {playersStats.length} spillere har deltatt i spillet.
                </Text>
              </Box>

              <Text color="gray.500" fontSize="xs" fontStyle="italic">
                Tips: Klikk på info-knappen (ⓘ) ved hver tabell for å lære mer om
                hvordan rangeringen beregnes.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Flest seire */}
      <Modal isOpen={isWinsOpen} onClose={onWinsClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🏆 Flest seire</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Dette leaderboardet viser spillere rangert etter antall kuponger hvor
                de hadde best score.
              </Text>
              
              <Text color="gray.600" fontSize="sm">
                <strong>Hvordan telles en seier?</strong>
                <br />
                Du får en seier når du har flest riktige svar på en kupong sammenlignet
                med alle andre spillere.
              </Text>

              <Text color="gray.600" fontSize="sm">
                <strong>Hva skjer ved lik score?</strong>
                <br />
                Ved delt førsteplass teller det som seier for alle spillere som deler
                den beste scoren.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Høyeste seiersprosent */}
      <Modal isOpen={isAvgOpen} onClose={onAvgClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📊 Høyeste treffprosent</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Dette leaderboardet viser spillere rangert etter gjennomsnittlig score
                på tvers av alle kuponger de har deltatt på.
              </Text>
              
              <Text color="gray.600" fontSize="sm">
                <strong>Hvordan beregnes prosenten?</strong>
                <br />
                Prosenten beregnes slik: (totalt antall riktige svar / totalt antall
                spørsmål besvart) × 100
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Info Modal - Flest riktige svar */}
      <Modal isOpen={isCorrectOpen} onClose={onCorrectClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>✅ Flest riktige svar</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm">
                Dette leaderboardet viser spillere rangert etter totalt antall riktige
                svar på tvers av alle kuponger.
              </Text>
              
              <Text color="gray.600" fontSize="sm">
                <strong>Hvordan beregnes dette?</strong>
                <br />
                Vi summerer alle riktige svar fra alle kupongene en spiller har deltatt på.
              </Text>

              <Text color="gray.600" fontSize="sm">
                <strong>Format:</strong>
                <br />
                Tallene vises som "X / Y" hvor X er antall riktige svar og Y er totalt
                antall spørsmål besvart.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

