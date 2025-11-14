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
  useToast,
  IconButton,
  Editable,
  EditableInput,
  EditablePreview,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import type { Question, AdminViewProps } from "../../interfaces/interfaces";
import CouponMaker from "./CouponMaker";
import OddsToolView from "../NorskTippingService/OddsToolView";
import { notifyResultsUpdate } from "../../utils/resultsUtils";
import { updateWinners } from "../../utils/statsUtils";

export default function AdminView({ coupon, onBack }: AdminViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [showNTTool, setShowNTTool] = useState(false);
  const [couponTitle, setCouponTitle] = useState(coupon.title);
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

    // Vent litt for å sikre at databasen er oppdatert
    await new Promise(resolve => setTimeout(resolve, 100));

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

    // Vent litt for å sikre at databasen er oppdatert
    await new Promise(resolve => setTimeout(resolve, 100));

    // Oppdater vinnere når fasit tømmes (alle blir ikke-vinnere)
    await updateWinners(coupon.id);

    // Notify ResultsView om oppdatering
    notifyResultsUpdate(coupon.id);
  };

  // Oppdater kupong navn
  const updateCouponTitle = async (newTitle: string) => {
    if (!newTitle.trim()) {
      toast({
        title: "Ugyldig navn",
        description: "Kupongnavn kan ikke være tomt",
        status: "warning",
        duration: 2000,
      });
      setCouponTitle(coupon.title); // Reset til original tittel
      return;
    }

    console.log('Oppdaterer kupongnavn:', { couponId: coupon.id, newTitle: newTitle.trim() });

    const { data, error } = await supabase
      .from('coupons')
      .update({ title: newTitle.trim() })
      .eq('id', coupon.id)
      .select();

    console.log('Update coupon response:', { data, error });

    if (error) {
      console.error('Feil ved oppdatering av kupong:', error);
      toast({
        title: "Kunne ikke oppdatere kupongnavn",
        description: error.message || "Sjekk RLS policies i Supabase.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setCouponTitle(coupon.title); // Reset til original tittel
      return;
    }

    if (!data || data.length === 0) {
      console.warn('Ingen rader ble oppdatert. Sjekk RLS policies.');
      toast({
        title: "Kunne ikke oppdatere kupongnavn",
        description: "Ingen endringer ble gjort. Sjekk tilganger i databasen.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      setCouponTitle(coupon.title); // Reset til original tittel
      return;
    }

    setCouponTitle(newTitle.trim());
    toast({
      title: "Kupongnavn oppdatert!",
      status: "success",
      duration: 2000,
    });
  };

  // Slett et enkelt spørsmål
  const deleteQuestion = async (questionId: number) => {
    console.log('Forsøker å slette spørsmål med ID:', questionId);
    
    const { data, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .select();

    console.log('Delete question response:', { data, error });

    if (error) {
      console.error('Feil ved sletting av spørsmål:', error);
      toast({
        title: "Kunne ikke slette spørsmål",
        description: error.message,
        status: "error",
        duration: 3000,
      });
      return;
    }

    if (!data || data.length === 0) {
      console.warn('Ingen rader ble slettet. Sjekk RLS policies.');
      toast({
        title: "Kunne ikke slette spørsmål",
        description: "Ingen endringer ble gjort. Sjekk tilganger i databasen.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    // Fjern også fasit for dette spørsmålet
    const { error: resultsError } = await supabase
      .from('results')
      .delete()
      .eq('question_id', questionId);

    if (resultsError) {
      console.error('Feil ved sletting av fasit:', resultsError);
    }

    // Oppdater lokalt
    setQuestions(questions.filter(q => q.id !== questionId));
    
    // Fjern fasit fra state
    const updatedResults = { ...results };
    delete updatedResults[String(questionId)];
    setResults(updatedResults);

    toast({
      title: "Spørsmål slettet",
      status: "success",
      duration: 2000,
    });

    // Oppdater vinnere
    await updateWinners(coupon.id);
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

    // Vent litt for å sikre at alle fasit-svar er lagret i databasen
    await new Promise(resolve => setTimeout(resolve, 200));

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
    <Box p={{ base: 0, md: 6 }} px={{ base: 1, md: 6 }} py={{ base: 1, md: 6 }}>
      {/* Tilbake-knapp */}
      <Button mb={{ base: 2, md: 4 }} variant="ghost" onClick={onBack} size={{ base: "sm", md: "md" }}>
        ← Tilbake til kuponger
      </Button>

      {/* Redigerbart kupong navn */}
      <HStack mb={6} spacing={3}>
        <Text fontSize="lg" fontWeight="bold">🧑‍💼 Rediger kupong:</Text>
        <Editable
          value={couponTitle}
          onChange={setCouponTitle}
          onSubmit={updateCouponTitle}
          fontSize="xl"
          fontWeight="bold"
          submitOnBlur={true}
        >
          <HStack>
            <EditablePreview cursor="pointer" _hover={{ bg: "gray.100" }} px={2} py={1} borderRadius="md" />
            <EditableInput maxW="400px" />
          </HStack>
        </Editable>
      </HStack>

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
          {showNTTool ? (
            <OddsToolView 
              couponId={coupon.id} 
              onQuestionAdded={reloadQuestions}
              onClose={() => setShowNTTool(false)}
            />
          ) : (
            <>
              <HStack justify="space-between" mb={4}>
                <Heading size="md">
            Legg inn fasit
          </Heading>
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  variant="outline"
                  onClick={() => setShowNTTool(true)}
                >
                  ⚽ Bruk NT Verktøy
                </Button>
              </HStack>

          {questions.length === 0 ? (
            <Text color="gray.500">
              Ingen spørsmål i denne kupongen enda.
            </Text>
          ) : (
            <VStack spacing={{ base: 2, md: 6 }} align="stretch">
              {questions.map((q) => (
                <Box
                  key={q.id}
                  borderWidth="1px"
                  borderRadius="md"
                  p={{ base: 1.5, md: 4 }}
                  bg="gray.50"
                  position="relative"
                >
                  {/* Slett-knapp i øvre høyre hjørne */}
                  <IconButton
                    aria-label="Slett spørsmål"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    position="absolute"
                    top={{ base: 0, md: 1 }}
                    right={{ base: 0, md: 1 }}
                    onClick={() => {
                      if (window.confirm(`Er du sikker på at du vil slette: "${q.text}"?`)) {
                        deleteQuestion(q.id);
                      }
                    }}
                  />

                  <Text fontWeight="bold" mb={{ base: 1.5, md: 4 }} pr={8} fontSize={{ base: "sm", md: "lg" }}>
                    {q.text}
                  </Text>

                  <HStack spacing={{ base: 1.5, md: 3 }} flexWrap="wrap">
                    {q.options.map((opt) => {
                      const isSelected = results[String(q.id)] === opt;
                      
                      // Ekstraher poeng fra alternativ-teksten hvis den finnes
                      // F.eks. "Arsenal (3.0p)" → navn: "Arsenal", poeng: "3.0p"
                      const match = opt.match(/^(.+?)\s*\(([^)]+)\)$/);
                      const displayName = match ? match[1].trim() : opt;
                      const points = match ? match[2] : null;
                      
                      return (
                    <Button
                      key={opt}
                      onClick={() => handleAnswerChange(String(q.id), opt)}
                      size={{ base: "sm", md: "md" }}
                      height="auto"
                      minH={{ base: "32px", md: "auto" }}
                      py={{ base: 1.5, md: 3 }}
                      px={{ base: 1.5, md: 4 }}
                      flex="1"
                      minW={{ base: "90px", md: "130px" }}
                      colorScheme={isSelected ? "green" : "gray"}
                      variant={isSelected ? "solid" : "outline"}
                      borderWidth={isSelected ? "2px" : "1px"}
                      borderColor={isSelected ? "green.500" : "gray.300"}
                      bg={isSelected ? "green.500" : "white"}
                      color={isSelected ? "white" : "gray.700"}
                      _hover={{
                        bg: isSelected ? "green.600" : "gray.50",
                        borderColor: isSelected ? "green.600" : "green.300",
                      }}
                      whiteSpace="normal"
                      fontWeight={isSelected ? "bold" : "medium"}
                    >
                          <HStack justify="space-between" width="100%" spacing={{ base: 1, md: 2 }} align="center">
                            <Text 
                              fontSize={{ base: "2xs", sm: "xs", md: "md" }}
                              textAlign="left"
                            >
                              {displayName}
                            </Text>
                            {points && (
                              <Text 
                                fontSize={{ base: "xs", sm: "sm", md: "lg" }} 
                                fontWeight="bold"
                                flexShrink={0}
                              >
                                {points}
                              </Text>
                            )}
                          </HStack>
                        </Button>
                    );
                  })}
                    </HStack>
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
            </>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
