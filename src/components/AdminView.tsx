import { useEffect, useState } from "react";
import { supabase } from "../database/supabaseClient";
import {
  Box,
  Button,
  Heading,
  VStack,
  Text,
  Stack,
  HStack,
  RadioGroup,
  Radio,
  Divider,
} from "@chakra-ui/react";
import type { Question, Result } from "../types/types";
import CouponMaker from "./CouponMaker";

export default function AdminView() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result>({});

  // Hent spørsmål og fasit ved mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select("*")
          .order("id", { ascending: true });

        if (questionError) throw questionError;
        setQuestions(questionData || []);

        const { data: resultData, error: resultError } = await supabase
          .from("results")
          .select("*");

        if (resultError) throw resultError;

        const mapped = resultData?.reduce((acc, r) => {
          acc[r.question_id] = r.correct_answer;
          return acc;
        }, {} as Record<string, string>);

        setResults(mapped || {});
      } catch (err) {
        console.error("Feil ved henting av data:", err);
      }
    };

    fetchData();
  }, []);

  // Lagre/oppdater fasit i Supabase
  const handleAnswerChange = async (questionId: string, value: string) => {
    const updated = { ...results, [questionId]: value };
    setResults(updated);

    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("results")
        .update({ correct_answer: value })
        .eq("question_id", questionId);
    } else {
      await supabase
        .from("results")
        .insert([{ question_id: questionId, correct_answer: value }]);
    }
  };

  // Tøm fasit-tabellen
  const clearResults = async () => {
    const { error } = await supabase.from("results").delete().neq("id", 0);
    if (error) console.error("Feil ved tømming av fasit:", error);
    else setResults({});
  };

  // Oppdater listen med spørsmål manuelt
  const reloadQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("id", { ascending: true });
    if (error) console.error("Feil ved henting av spørsmål:", error);
    else setQuestions(data || []);
  };

  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">🧑‍💼 Adminpanel</Heading>

        <CouponMaker onQuestionAdded={reloadQuestions} />

        <Divider />

        <Box>
          <Heading size="md" mb={4}>
            🏁 Legg inn fasit
          </Heading>

          {questions.length === 0 ? (
            <Text color="gray.500">
              Ingen spørsmål i kupongen enda. Lag dem først.
            </Text>
          ) : (
            <VStack spacing={6} align="stretch">
              {questions.map((q) => (
                <Box
                  key={q.id}
                  borderWidth="1px"
                  borderRadius="md"
                  p={4}
                  bg="gray.50"
                >
                  <Text fontWeight="bold" mb={2}>
                    {q.text}
                  </Text>

                  <RadioGroup
                    value={results[q.id] ?? ""}
                    onChange={(val) => handleAnswerChange(q.id, val)}
                  >
                    <HStack spacing={6}>
                      {q.options.map((opt) => (
                        <Radio key={opt} value={opt}>
                          {opt}
                        </Radio>
                      ))}
                    </HStack>
                  </RadioGroup>
                </Box>
              ))}

              <Stack direction="row" spacing={4}>
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={clearResults}
                >
                  Tøm fasit
                </Button>
                <Button colorScheme="gray" onClick={reloadQuestions}>
                  Oppdater kupong
                </Button>
              </Stack>
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
