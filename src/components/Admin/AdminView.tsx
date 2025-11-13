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
  useToast,
} from "@chakra-ui/react";
import type { Question, AdminViewProps } from "../../interfaces/interfaces";
import CouponMaker from "./CouponMaker";
import { notifyResultsUpdate } from "../../utils/resultsUtils";
import { updateWinners } from "../../utils/statsUtils";

export default function AdminView({ coupon, onBack }: AdminViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const toast = useToast();

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

    // Konverter questionId til number for database
    const questionIdNum = Number(questionId);

    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("question_id", questionIdNum)
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
          question_id: questionIdNum,
          correct_answer: value,
        },
      ]);
    }

    // Oppdater vinnere når fasit endres
    await updateWinners(coupon.id);

    // Notify ResultsView om oppdatering
    notifyResultsUpdate(Number(coupon.id));
  };

  // Tøm fasit for denne kupongen
  const clearResults = async () => {
    console.log("Prøver å tømme fasit for kupong:", coupon.id);

    const { data, error } = await supabase
      .from("results")
      .delete()
      .eq("coupon_id", coupon.id)
      .select();

    console.log("Delete response:", { data, error });

    if (error) {
      console.error("Feil ved tømming av fasit:", error);
      toast({
        title: "Kunne ikke tømme fasit",
        description: error.message || "Sjekk RLS policies i Supabase.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!data || data.length === 0) {
      console.warn("Ingen rader ble slettet. Enten er det ingen fasit, eller RLS blokkerer.");
      toast({
        title: "Ingen fasit å tømme",
        description: "Enten er det ingen fasit, eller RLS policies blokkerer sletting.",
        status: "info",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setResults({});
    toast({
      title: "Fasit tømt!",
      description: `${data.length} fasitsvar ble slettet.`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });

    // Oppdater vinnere når fasit tømmes (alle blir ikke-vinnere)
    await updateWinners(coupon.id);

    // Notify ResultsView om oppdatering
    notifyResultsUpdate(coupon.id);
  };

  // Send inn fasit og beregn vinnere
  const reloadQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("coupon_id", coupon.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Feil ved henting av spørsmål:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere spørsmål.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setQuestions(data || []);

    // Beregn vinnere basert på fasit
    await updateWinners(coupon.id);

    // Notify ResultsView om oppdatering
    notifyResultsUpdate(coupon.id);

    toast({
      title: "Fasit sendt inn!",
      description: "Vinnere er beregnet.",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
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
                  Send inn fasit
                </Button>
              </Stack>
            </VStack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
