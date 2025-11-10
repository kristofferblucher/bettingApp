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
  VStack,
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
import type { Answer, Result, Question, PlayerScore } from "../types/types";
import { supabase } from "../database/supabaseClient";

export default function ResultsView() {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [topScore, setTopScore] = useState(0);
  const toast = useToast();

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [{ data: qData, error: qError }, { data: aData, error: aError }, { data: rData, error: rError }] = await Promise.all([
        supabase.from("questions").select("*").order("id", { ascending: true }),
        supabase.from("answers").select("*"),
        supabase.from("results").select("*"),
      ]);

      if (qError || aError || rError) throw qError || aError || rError;

      setQuestions(qData || []);

      // Resultatene som objekt: { question_id: correct_answer }
      const resultMap =
        rData?.reduce((acc, r) => {
          acc[r.question_id] = r.correct_answer;
          return acc;
        }, {} as Record<string, string>) || {};

      setResults(resultMap);

      const hasFasit = Object.keys(resultMap).length > 0;
      setHasResults(hasFasit);

      // Beregn poeng for hver spiller
      const allScores: PlayerScore[] = (aData || []).map((a) => {
        let correct = 0;
        const total = qData?.length || 0;

        if (hasFasit) {
          qData?.forEach((q) => {
            const fasitSvar = resultMap[q.id];
            const spillerSvar = a.answers[q.id];
            if (fasitSvar && spillerSvar === fasitSvar) correct++;
          });
        }

        return { name: a.player_name, correct, total, answers: a.answers };
      });

      if (hasFasit) allScores.sort((a, b) => b.correct - a.correct);

      const best = hasFasit && allScores.length > 0 ? allScores[0].correct : 0;
      setTopScore(best);
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
    <Flex
      p={6}
      gap={8}
      align="flex-start"
      justify="flex-start"
      bg="gray.50"
      minH="100vh"
    >
      <Box
        flex="1"
        minW="300px"
        maxW="360px"
        bg="white"
        borderWidth="1px"
        borderRadius="md"
        shadow="sm"
        p={4}
      >
        <Heading size="md" mb={4} textAlign="center">
          🏆 Resultater
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
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {scores.map((s) => (
                  <Tr
                    key={s.name}
                    bg={
                      hasResults && s.correct === topScore ? "green.50" : undefined
                    }
                    fontWeight={
                      hasResults && s.correct === topScore ? "bold" : "normal"
                    }
                  >
                    <Td>{s.name}</Td>
                    <Td>
                      {hasResults ? (
                        <Text>
                          {s.correct} / {s.total}
                        </Text>
                      ) : (
                        <Text color="gray.500">Venter på resultater...</Text>
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

  
      <Box w="1px" bg="gray.300" alignSelf="stretch" borderRadius="full" />

      <Box flex="2" minW="400px" maxW="900px" pr={6}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {scores.map((s) => {
            const isWinner = hasResults && s.correct === topScore;

            return (
              <Card
                key={s.name}
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
                  {hasResults && (
                    <Badge
                      colorScheme={isWinner ? "green" : "blue"}
                      mt={1}
                    >
                      {s.correct} av {s.total} riktige
                    </Badge>
                  )}
                </CardHeader>
                <CardBody>
                  <Stack divider={<StackDivider />} spacing="3">
                    {questions.map((q) => {
                      const spillerSvar = s.answers[q.id];
                      const fasitSvar = results[q.id];
                      const isCorrect =
                        hasResults && spillerSvar === fasitSvar;

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
                            >
                              {spillerSvar ?? "-"}
                            </Text>
                          </Text>
                          {hasResults && (
                            <Text fontSize="sm" color="gray.600">
                              Fasit: {fasitSvar ?? "-"}
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
  );
}
