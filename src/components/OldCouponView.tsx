import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  VStack,
  Text,
  HStack,
  Radio,
  RadioGroup,
  useToast,
} from "@chakra-ui/react";
import type { Question, Answer } from "../types/types";
import { supabase } from "../database/supabaseClient";

export default function CouponView() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  // Hent spørsmål fra Supabase
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Feil ved henting av spørsmål:", error);
        toast({
          title: "Kunne ikke hente spørsmål.",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        setQuestions(data || []);
      }
    };

    fetchQuestions();
  }, [toast]);

  // Endre svar lokalt
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Send inn kupongen (lagres i Supabase)
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Mangler navn",
        description: "Skriv inn navnet ditt før du leverer.",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    try {
      const { error } = await supabase.from("answers").insert([
        {
          player_name: name,
          answers, // lagres som JSONB
        },
      ]);

      if (error) throw error;

      setSubmitted(true);
      setName("");
      setAnswers({});

      toast({
        title: "Kupong levert!",
        description: "Lykke til 🍀",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (err: any) {
      console.error("Feil ved innsending:", err);
      toast({
        title: "Noe gikk galt",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">⚽ Dagens tippekupong</Heading>

        {submitted ? (
          <Box
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
            p={4}
            borderRadius="md"
          >
            <Text color="green.600" fontWeight="bold">
              ✅ Kupongen er levert! Lykke til!
            </Text>
            <Button mt={3} onClick={() => setSubmitted(false)}>
              Lever en ny kupong
            </Button>
          </Box>
        ) : (
          <>
            <Input
              placeholder="Navnet ditt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxW="300px"
            />

            {questions.length === 0 ? (
              <Text color="gray.500">
                Ingen kupong tilgjengelig akkurat nå.
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
                      value={answers[q.id] ?? ""}
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
              </VStack>
            )}

            {questions.length > 0 && (
              <Button colorScheme="blue" onClick={handleSubmit}>
                Lever kupong
              </Button>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}
