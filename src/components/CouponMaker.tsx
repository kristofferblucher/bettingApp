import { useEffect, useState } from "react";
import { supabase } from "../database/supabaseClient";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  List,
  ListItem,
  Text,
  useToast,
} from "@chakra-ui/react";
import type { Question } from "../types/types";

interface CouponMakerProps {
  onQuestionAdded?: () => void; // lar AdminView oppdatere listen etterpå
}

export default function CouponMaker({ onQuestionAdded }: CouponMakerProps) {
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const toast = useToast();

  // Hent spørsmål ved oppstart
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: true });
      if (error) {
        console.error("Feil ved henting av spørsmål:", error);
      } else {
        setQuestions(data || []);
      }
    };
    fetchQuestions();
  }, []);

  // Legg til nytt spørsmål i Supabase
  const addQuestion = async () => {
    if (!questionText.trim() || !optionsText.trim()) return;

    const options = optionsText.split(",").map((o) => o.trim());
    const { data, error } = await supabase
      .from("questions")
      .insert([{ text: questionText, options }])
      .select();

    if (error) {
      console.error("Feil ved lagring:", error);
      toast({
        title: "Kunne ikke lagre spørsmål.",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      const newQuestion = data?.[0];
      setQuestions((prev) => [...prev, newQuestion]);
      setQuestionText("");
      setOptionsText("");
      toast({
        title: "Spørsmål lagt til!",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Gi beskjed til AdminView at et nytt spørsmål ble lagt til
      if (onQuestionAdded) onQuestionAdded();
    }
  };

  // Tøm alle spørsmål (fra databasen)
  const clearAll = async () => {
    const { error } = await supabase.from("questions").delete().neq("id", 0);
    if (error) {
      console.error("Feil ved tømming:", error);
      toast({
        title: "Kunne ikke tømme spørsmål.",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      setQuestions([]);
      toast({
        title: "Alle spørsmål slettet.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4} bg="gray.50" borderRadius="md" shadow="sm">
      <Heading size="md" mb={4}>
        Lag kupong
      </Heading>

      <VStack spacing={3} align="stretch">
        <Input
          placeholder="Skriv spørsmål..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />
        <Input
          placeholder="Svaralternativer (kommaseparert, f.eks. Ja, Nei)"
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
        <Button colorScheme="blue" onClick={addQuestion}>
          Legg til spørsmål
        </Button>
      </VStack>

      <Box mt={6}>
        <Heading size="sm" mb={2}>
          Spørsmål i kupong:
        </Heading>

        {questions.length === 0 ? (
          <Text color="gray.500">Ingen spørsmål enda.</Text>
        ) : (
          <List spacing={2}>
            {questions.map((q) => (
              <ListItem key={q.id}>
                <strong>{q.text}</strong> — ({q.options.join(", ")})
              </ListItem>
            ))}
          </List>
        )}

        {questions.length > 0 && (
          <Button mt={4} colorScheme="red" variant="outline" onClick={clearAll}>
            Tøm alle spørsmål
          </Button>
        )}
      </Box>
    </Box>
  );
}
