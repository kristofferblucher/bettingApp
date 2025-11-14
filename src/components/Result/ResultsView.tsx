import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Card,
  CardHeader,
  CardBody,
  Stack,
  StackDivider,
  Badge,
  SimpleGrid,
  Flex,
  useToast,
} from "@chakra-ui/react";
import type { Question, Submission, Coupon } from "../../interfaces/interfaces";
import type { ScoreWithId } from "../../types/types";
import { supabase } from "../../database/supabaseClient";
import { onResultsUpdate } from "../../utils/resultsUtils";

interface ResultsViewProps {
  coupon: Coupon;
  onBack: () => void;
}

export default function ResultsView({ coupon, onBack }: ResultsViewProps) {
  const [scores, setScores] = useState<ScoreWithId[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [topScore, setTopScore] = useState(0);
  const toast = useToast();

  useEffect(() => {
    refresh();
  }, [coupon.id]);

  // Lytter på oppdateringer fra admin
  useEffect(() => {
    const cleanup = onResultsUpdate((updatedCouponId) => {
      // Oppdater kun hvis det er vår kupong
      if (updatedCouponId === coupon.id) {
        console.log("✨ Admin har oppdatert fasit, refresher...");
        toast({
          title: "Fasit oppdatert!",
          description: "Resultater er oppdatert av admin.",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        refresh();
      }
    });

    return cleanup;
  }, [coupon.id]);

  const refresh = async () => {

    try {
      const [
        { data: qData, error: qError },
        { data: sData, error: sError },
        { data: rData, error: rError },
      ] = await Promise.all([
        supabase
          .from("questions")
          .select("*")
          .eq("coupon_id", coupon.id)
          .order("id", { ascending: true }),
        supabase
          .from("submissions")
          .select("*")
          .eq("coupon_id", coupon.id),
        supabase.from("results").select("*").eq("coupon_id", coupon.id),
      ]);

      if (qError || sError || rError) throw qError || sError || rError;

      setQuestions(qData || []);

      // Resultatene som objekt: { question_id: correct_answer }
      const resultMap =
        rData?.reduce((acc, r) => {
          acc[String(r.question_id)] = r.correct_answer;
          return acc;
        }, {} as Record<string, string>) || {};

      setResults(resultMap);

      const hasFasit = Object.keys(resultMap).length > 0;
      setHasResults(hasFasit);

      // Beregn poeng for hver submission
      const allScores: ScoreWithId[] = (sData || []).map((submission: Submission) => {
        let correct = 0;
        let totalPoints = 0;
        const total = qData?.length || 0;

        if (hasFasit && submission.answers) {
          qData?.forEach((q) => {
            const fasitSvar = resultMap[String(q.id)];
            const spillerSvar = submission.answers[q.id];
            if (fasitSvar && spillerSvar === fasitSvar) {
              correct++;
              
              // Beregn poeng: bruk option_points hvis det finnes, ellers 1 poeng
              if (q.option_points && q.options) {
                const optionIndex = q.options.indexOf(fasitSvar);
                if (optionIndex !== -1 && q.option_points[optionIndex] !== undefined) {
                  totalPoints += q.option_points[optionIndex];
                } else {
                  totalPoints += 1; // Fallback hvis option_points mangler for dette alternativet
                }
              } else {
                totalPoints += 1; // Standard 1 poeng for spørsmål uten option_points
              }
            }
          });
        }

        // Bruk player_name hvis det finnes, ellers bruk forkortet device_id
        const displayName = submission.player_name || (() => {
          const deviceId = submission.device_id;
          return deviceId.length > 12 
            ? `${deviceId.slice(0, 8)}...${deviceId.slice(-4)}`
            : deviceId;
        })();

        // Konverter answers fra Record<number, string> til Record<string, string>
        const answersAsString: Record<string, string> = {};
        if (submission.answers) {
          Object.entries(submission.answers).forEach(([key, value]) => {
            answersAsString[String(key)] = value;
          });
        }

        return {
          name: displayName,
          correct,
          total,
          answers: answersAsString,
          submissionId: submission.id,
          points: totalPoints,
        };
      });

      // Sorter etter poeng (høyest først), deretter etter antall riktige
      if (hasFasit) allScores.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.correct - a.correct;
      });

      const bestPoints = hasFasit && allScores.length > 0 ? allScores[0].points : 0;
      setTopScore(bestPoints);
      setScores(allScores);
    } catch (err: any) {
      console.error("Feil ved lasting av resultater:", err);
      toast({
        title: "Feil ved lasting av resultater",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Flex
        p={6}
        gap={8}
        direction={{ base: "column", lg: "row" }}
        align="flex-start"
        justify="flex-start"
        bg="gray.50"
        minH="100vh"
      >
        <Box
          flex="1"
          w={{ base: "100%", lg: "auto" }}
          minW={{ base: "auto", lg: "300px" }}
          maxW={{ base: "100%", lg: "360px" }}
        >
          <Button onClick={onBack} mb={4} variant="outline">
            ← Tilbake 
          </Button>
          
          <Box
            bg="white"
            borderWidth="1px"
            borderRadius="md"
            shadow="sm"
            p={4}
          >
          <Heading size="md" mb={4} textAlign="center">
            🏆 Resultater for kupongen: {coupon.title}
          </Heading>

        {scores.length === 0 ? (
          <Text color="gray.500" textAlign="center">
            Ingen resultater enda.
          </Text>
        ) : (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th>Navn</Th>
                  <Th textAlign="center">Antall rette</Th>
                  <Th textAlign="center">Poeng</Th>
                </Tr>
              </Thead>
              <Tbody>
                {scores.map((s) => (
                  <Tr
                    key={s.submissionId}
                    bg={
                      hasResults && s.points === topScore ? "green.50" : undefined
                    }
                    fontWeight={
                      hasResults && s.points === topScore ? "bold" : "normal"
                    }
                  >
                    <Td>{s.name}</Td>
                    <Td textAlign="center">
                      {hasResults ? (
                        <Text>
                          {s.correct} / {s.total}
                        </Text>
                      ) : (
                        <Text color="gray.500">Venter på resultater...</Text>
                      )}
                    </Td>
                    <Td textAlign="center">
                      {hasResults ? (
                        <Text fontWeight="bold" color="blue.600">
                          {Math.round(s.points)}
                        </Text>
                      ) : (
                        <Text color="gray.400">-</Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}

        <Button mt={4} colorScheme="blue" w="full" onClick={refresh}>
          Oppdater resultater
        </Button>
        </Box>
      </Box>

  
      <Box 
        display={{ base: "none", lg: "block" }}
        w="1px" 
        bg="gray.300" 
        alignSelf="stretch" 
        borderRadius="full" 
      />

      <Box 
        flex="2" 
        w={{ base: "100%", lg: "auto" }}
        minW={{ base: "auto", lg: "400px" }}
        maxW={{ base: "100%", lg: "900px" }}
        pr={{ base: 0, lg: 6 }}
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {scores.map((s) => {
            const isWinner = hasResults && s.points === topScore;

            return (
              <Card
                key={s.submissionId}
                borderWidth="2px"
                borderRadius="lg"
                shadow="sm"
                bg={isWinner ? "green.50" : "white"}
                borderColor={isWinner ? "green.400" : "gray.200"}
                _hover={{ shadow: "md" }}
              >
                <CardHeader textAlign="center">
                  <Heading size="md">
                    {isWinner ? "🏅 " : ""}
                    {s.name}
                  </Heading>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Kupongnavn: {coupon?.title}
                  </Text>
                  {hasResults && (
                    <Stack direction="row" spacing={2} justify="center" mt={2}>
                      <Badge
                        colorScheme={isWinner ? "green" : "blue"}
                      >
                        {s.correct} av {s.total} riktige
                      </Badge>
                      <Badge
                        colorScheme="purple"
                        fontSize="md"
                      >
                        {Math.round(s.points)} poeng
                      </Badge>
                    </Stack>
                  )}
                </CardHeader>
                <CardBody>
                  <Stack divider={<StackDivider />} spacing="3">
                    {questions.map((q) => {
                      const spillerSvar = s.answers[String(q.id)];
                      const fasitSvar = results[String(q.id)];
                      const isCorrect =
                        hasResults && spillerSvar === fasitSvar;

                      // Funksjon for å ekstrahere navn og poeng fra svar-tekst
                      const extractNameAndPoints = (answer: string, question: Question) => {
                        if (!answer) return { name: "-", points: null };
                        
                        // Sjekk om svaret allerede har poeng i teksten (f.eks. "Arsenal (3.0p)")
                        const match = answer.match(/^(.+?)\s*\(([^)]+)\)$/);
                        if (match) {
                          return { name: match[1].trim(), points: match[2] };
                        }
                        
                        // Hvis ikke, finn poeng fra option_points
                        const optionIndex = question.options?.findIndex(opt => opt === answer);
                        if (optionIndex !== -1 && question.option_points && question.option_points[optionIndex] !== undefined) {
                          const points = Math.round(question.option_points[optionIndex]);
                          return { name: answer, points: `${points}p` };
                        }
                        
                        // Standard: 1p for manuelle spørsmål
                        return { name: answer, points: "1p" };
                      };

                      const playerAnswer = extractNameAndPoints(spillerSvar, q);
                      const correctAnswer = extractNameAndPoints(fasitSvar, q);

                      return (
                        <Box key={q.id}>
                          <Text fontWeight="bold">{q.text}</Text>
                          <Text>
                            <Text
                              as="span"
                              color={
                                hasResults
                                  ? isCorrect
                                    ? "green.500"
                                    : "red.500"
                                  : "black"
                              }
                              fontWeight="semibold"
                            >
                              {playerAnswer.name}
                              {playerAnswer.points && (
                                <Text as="span" fontSize="sm" ml={1} opacity={0.8}>
                                  ({playerAnswer.points})
                                </Text>
                              )}
                            </Text>
                          </Text>
                          {hasResults && (
                            <Text fontSize="sm" color="gray.600">
                              Fasit: {correctAnswer.name}
                              {correctAnswer.points && (
                                <Text as="span" fontSize="sm" ml={1}>
                                  ({correctAnswer.points})
                                </Text>
                              )}
                            </Text>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      </Box>
    </Flex>
    </Box>
  );
}
