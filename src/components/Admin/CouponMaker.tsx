import { useEffect, useState } from "react";
import { supabase } from "../../database/supabaseClient";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  List,
  ListItem,
  Text,
  HStack,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import type { Question, CouponMakerProps } from "../../interfaces/interfaces";
import validate from "../../utils/couponMakerUtils";

export default function CouponMaker({ couponId, onQuestionAdded }: CouponMakerProps) {
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]); // starter med 2 felt
  const [optionPoints, setOptionPoints] = useState<string[]>(["", ""]); // poeng per alternativ (tom string = standard 1p)
  const [questions, setQuestions] = useState<Question[]>([]);
  const toast = useToast();



  // Hent spørsmål fra Supabase ved oppstart
  useEffect(() => {
    if (!couponId) return; // 👈 unngå spørring hvis ingen kupong valgt

    // Nullstill state umiddelbart når kupong endres
    setQuestions([]);
    setQuestionText("");
    setOptions(["", ""]);
    setOptionPoints(["", ""]);

    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("coupon_id", couponId) // 👈 hent kun spørsmål for valgt kupong
        .order("id", { ascending: true });

      if (error) {
        console.error("Feil ved henting av spørsmål:", error);
      } else {
        setQuestions(data || []);
      }
    };

    fetchQuestions();
  }, [couponId]);


  // Oppdater et enkelt svaralternativ
  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  // Oppdater poeng for et alternativ
  const updateOptionPoints = (index: number, value: string) => {
    const updated = [...optionPoints];
    updated[index] = value;
    setOptionPoints(updated);
  };

  // Legg til et nytt svarfelt
  const addOption = () => {
    setOptions([...options, ""]);
    setOptionPoints([...optionPoints, ""]); // legg til tomt poeng-felt
  };


  // Fjern et svarfelt (må alltid ha minst to)
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
    setOptionPoints(optionPoints.filter((_, i) => i !== index));
  };


  const addQuestion = async () => {
    // Trim + filtrer alternativer først
    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
  
    // Kjør validering
    const errorMessage = validate(questionText, filteredOptions);
    if (errorMessage) {
      toast({
        title: "Ugyldig spørsmål",
        description: errorMessage,
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
  
    // Bygg option_points array: hvis tomt/ugyldig, bruk 1 poeng
    const pointsArray: number[] = filteredOptions.map((_, index) => {
      const pointValue = optionPoints[index]?.trim();
      if (!pointValue) return 1; // Standard: 1 poeng
      
      const parsed = parseFloat(pointValue);
      if (isNaN(parsed) || parsed <= 0) {
        toast({
          title: "Ugyldig poengverdi",
          description: `Alternativ ${index + 1}: "${pointValue}" er ikke et gyldig tall > 0. Bruker 1 poeng.`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return 1;
      }
      return parsed;
    });
  
    // Lagre i Supabase
    const { data, error } = await supabase
      .from("questions")
      .insert([{ 
        coupon_id: couponId,
        text: questionText, 
        options: filteredOptions,
        option_points: pointsArray, // Lagre poeng
      }])
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
      return;
    }
  
    // Oppdater lokalt
    const newQuestion = data?.[0];
    setQuestions((prev) => [...prev, newQuestion]);
    setQuestionText("");
    setOptions(["", ""]);
    setOptionPoints(["", ""]); // Nullstill poeng
  
    toast({
      title: "Spørsmål lagt til!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  
    onQuestionAdded?.();
  };




  // Slett alle spørsmål
  const clearAll = async () => {
    const { error } = await supabase.from("questions").delete().eq("coupon_id", couponId);
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
        
        <Text fontSize="sm" color="gray.600">
          💡 La poeng-feltet stå tomt for å gi 1 poeng. Sett egne verdier for andre poengsummer.
        </Text>

        <VStack spacing={2} align="stretch">
          {options.map((opt, i) => (
            <HStack key={i} spacing={2}>
              <Input
                placeholder={`Alternativ ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                flex="3"
              />
              <Input
                placeholder="Poeng (1)"
                value={optionPoints[i]}
                onChange={(e) => updateOptionPoints(i, e.target.value)}
                type="number"
                step="0.1"
                min="0.1"
                w="100px"
                size="sm"
              />
              {options.length > 2 && (
                <IconButton
                  aria-label="Fjern alternativ"
                  icon={<CloseIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => removeOption(i)}
                />
              )}
            </HStack>
          ))}

          <Button
            leftIcon={<AddIcon />}
            size="sm"
            variant="outline"
            colorScheme="blue"
            alignSelf="flex-start"
            onClick={addOption}
          >
            Legg til alternativ
          </Button>
        </VStack>

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
                <strong>{q.text}</strong> — 
                {q.options.map((opt, i) => {
                  const points = q.option_points?.[i];
                  return (
                    <span key={i}>
                      {i > 0 ? ", " : " "}
                      {opt}
                      {points ? ` (${points}p)` : " (1p)"}
                    </span>
                  );
                })}
              </ListItem>
            ))}
          </List>
        )}

        {questions.length > 0 && (
          <Button mt={4} colorScheme="red" variant="outline" onClick={clearAll}>
            Slett alle spørsmål
          </Button>
        )}
      </Box>
    </Box>
  );
}
