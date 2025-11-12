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

export default function ResultsView() {
  const [scores, setScores] = useState<ScoreWithId[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [topScore, setTopScore] = useState(0);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchCoupon();
  }, []);

  useEffect(() => {
    if (coupon) {
      refresh();
    }
  }, [coupon]);

  // Lytter på oppdateringer fra admin
  useEffect(() => {
    if (!coupon) return;

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
  }, [coupon]);

  const fetchCoupon = async () => {
    // Hent den siste kupongen (sortert på deadline, descending)
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("deadline", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Feil ved henting av kupong:", error);
      return;
    }

    if (data) {
      setCoupon(data);
    }
  };

  const refresh = async () => {
    if (!coupon) return;

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
        const total = qData?.length || 0;

        if (hasFasit && submission.answers) {
          qData?.forEach((q) => {
            const fasitSvar = resultMap[String(q.id)];
            const spillerSvar = submission.answers[q.id];
            if (fasitSvar && spillerSvar === fasitSvar) correct++;
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
        };
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

  if (!coupon) {
    return (
      <Box p={6}>
        <Text color="gray.500">Laster kupong...</Text>
      </Box>
    );
  }

  return (
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
        bg="white"
        borderWidth="1px"
        borderRadius="md"
        shadow="sm"
        p={4}
      >
        <Heading size="md" mb={2} textAlign="center">
          🏆 Resultater
        </Heading>
        <Text fontSize="sm" color="gray.600" mb={4} textAlign="center">
          {coupon.title}
        </Text>

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
                    key={s.submissionId}
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
            const isWinner = hasResults && s.correct === topScore;

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
                      const spillerSvar = s.answers[String(q.id)];
                      const fasitSvar = results[String(q.id)];
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
