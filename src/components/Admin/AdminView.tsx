import { useEffect, useState } from "react";
import { supabase } from "../../database/supabaseClient";
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
} from "@chakra-ui/react";
import type { Question } from "../../types/types";
import CouponMaker from "./CouponMaker";

interface AdminViewProps {
  coupon: { id: string; title: string };
  onBack: () => void;
}

export default function AdminView({ coupon, onBack }: AdminViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});

  // Hent spørsmål og fasit for valgt kupong
  useEffect(() => {
    // Nullstill state umiddelbart når kupong endres
    setQuestions([]);
    setResults({});

    const fetchData = async () => {
      try {
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select("*")
          .eq("coupon_id", coupon.id) // ✅ filtrer på valgt kupong
          .order("id", { ascending: true });

        if (questionError) throw questionError;
        setQuestions(questionData || []);

        const { data: resultData, error: resultError } = await supabase
          .from("results")
          .select("*")
          .eq("coupon_id", coupon.id); // ✅ filtrer på valgt kupong

        if (resultError) throw resultError;

        const mapped = resultData?.reduce((acc, r) => {
          acc[String(r.question_id)] = r.correct_answer;
          return acc;
        }, {} as Record<string, string>);

        setResults(mapped || {});
      } catch (err) {
        console.error("Feil ved henting av data:", err);
      }
    };

    fetchData();
  }, [coupon.id]);

  // Lagre/oppdater fasit
  const handleAnswerChange = async (questionId: string, value: string) => {
    const updated = { ...results, [questionId]: value };
    setResults(updated);

    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("question_id", questionId)
      .eq("coupon_id", coupon.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("results")
        .update({ correct_answer: value })
        .eq("id", existing.id);
    } else {
      await supabase.from("results").insert([
        {
          coupon_id: coupon.id,
          question_id: questionId,
          correct_answer: value,
        },
      ]);
    }
  };

  // Tøm fasit for denne kupongen
  const clearResults = async () => {
    const { error } = await supabase
      .from("results")
      .delete()
      .eq("coupon_id", coupon.id);

    if (error) console.error("Feil ved tømming av fasit:", error);
    else setResults({});
  };

  // Oppdater listen manuelt
  const reloadQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("coupon_id", coupon.id)
      .order("id", { ascending: true });

    if (error) console.error("Feil ved henting av spørsmål:", error);
    else setQuestions(data || []);
  };

  return (
    <Box p={6}>
      {/* Tilbake-knapp */}
      <Button mb={4} variant="ghost" onClick={onBack}>
        ← Tilbake til kuponger
      </Button>

      <Heading size="lg" mb={6}>
        🧑‍💼 Rediger kupong: {coupon.title}
      </Heading>

      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={8}
        align="flex-start"
        justify="space-between"
      >
        {/* Lag spørsmål */}
        <Box flex="1" minW={{ base: "100%", md: "50%" }}>
          <CouponMaker
            key={coupon.id}
            couponId={coupon.id}
            onQuestionAdded={reloadQuestions}
          />
        </Box>

        {/* Legg inn fasit */}
        <Box flex="1" p={4} minW={{ base: "100%", md: "50%" }}>
          <Heading size="md" mb={4}>
            Legg inn fasit
          </Heading>

          {questions.length === 0 ? (
            <Text color="gray.500">
              Ingen spørsmål i denne kupongen enda.
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
                    value={results[String(q.id)] ?? ""}
                    onChange={(val) => handleAnswerChange(String(q.id), val)}
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
      </Stack>
    </Box>
  );
}
