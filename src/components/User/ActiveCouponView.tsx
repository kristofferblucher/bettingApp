import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Radio,
  RadioGroup,
  Stack,
  useToast,
  HStack,
  Input,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { supabase } from "../../database/supabaseClient";
import { getDeviceId } from "../../utils/deviceUtils";
import type { Question, Coupon, Submission } from "../../interfaces/interfaces";
import { saveToStorage, loadFromStorage } from "../../utils/storage";

interface ActiveCouponViewProps {
  coupon: Coupon;
  onBack: () => void;
}

export default function ActiveCouponView({ coupon, onBack }: ActiveCouponViewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerName, setPlayerName] = useState<string>("");
  const toast = useToast();
  const deviceId = getDeviceId();

  // Hent spørsmål og evt. tidligere submission
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [{ data: qData }, { data: subData }] = await Promise.all([
        supabase
          .from("questions")
          .select("*")
          .eq("coupon_id", coupon.id)
          .order("id", { ascending: true }),
        supabase
          .from("submissions")
          .select("*")
          .eq("coupon_id", coupon.id)
          .eq("device_id", deviceId)
          .maybeSingle(),
      ]);

      if (qData) setQuestions(qData);
      if (subData) {
        setAnswers(subData.answers || {});
        setSubmission(subData);
        // Hent navn fra submission eller localStorage
        if (subData.player_name) {
          setPlayerName(subData.player_name);
          saveToStorage("playerName", subData.player_name);
        } else {
          const savedName = loadFromStorage<string>("playerName", "");
          if (savedName) {
            setPlayerName(savedName);
          }
        }
        // Lagre i localStorage at denne kupongen er levert
        const submittedCoupons = loadFromStorage<number[]>("submittedCoupons", []);
        if (!submittedCoupons.includes(coupon.id)) {
          saveToStorage("submittedCoupons", [...submittedCoupons, coupon.id]);
        }
      } else {
        // Hent navn fra localStorage hvis ingen submission
        const savedName = loadFromStorage<string>("playerName", "");
        if (savedName) {
          setPlayerName(savedName);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [coupon.id, deviceId]);

  // Sjekk om det er mer enn 5 minutter til deadline
  const canEditOrDelete = (): boolean => {
    const deadline = new Date(coupon.deadline);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutter i millisekunder
    return deadline.getTime() - now.getTime() > fiveMinutes;
  };

  // Endre svar for et spørsmål
  const handleAnswer = (questionId: number, value: string) => {
    if (!canEditOrDelete() && submission) {
      toast({
        title: "Ikke mulig å redigere",
        description: "Du kan ikke redigere mindre enn 5 minutter før fristen.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Lagre eller oppdatere submission
  const handleSubmit = async () => {
    if (!canEditOrDelete() && submission) {
      toast({
        title: "Ikke mulig å lagre",
        description: "Du kan ikke lagre endringer mindre enn 5 minutter før fristen.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Valider navn
    if (!playerName.trim()) {
      toast({
        title: "Mangler navn",
        description: "Skriv inn navnet ditt før du sender inn.",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    const allAnswered = questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      toast({
        title: "Besvar alle spørsmål før du sender inn.",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    // Lagre navn i localStorage
    saveToStorage("playerName", playerName.trim());

    try {
      if (submission) {
        // Oppdater eksisterende submission
        // Prøv å oppdatere med player_name, hvis det feiler, prøv uten (fallback)
        let updateData: any = { answers };
        
        // Prøv å legge til player_name hvis kolonnen finnes
        try {
          updateData.player_name = playerName.trim();
        } catch {
          // Ignorer hvis kolonnen ikke finnes
        }

        const { error } = await supabase
          .from("submissions")
          .update(updateData)
          .eq("id", submission.id);

        if (error) {
          // Hvis feil pga. player_name kolonne mangler, prøv uten
          if (error.message.includes("player_name") || error.code === "42703") {
            const { error: retryError } = await supabase
              .from("submissions")
              .update({ answers })
              .eq("id", submission.id);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }

        toast({
          title: "Kupong oppdatert!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        // Opprett ny submission
        // Prøv først med player_name, hvis det feiler, prøv uten (fallback)
        let insertData: any = {
          coupon_id: coupon.id,
          device_id: deviceId,
          answers,
        };
        
        // Legg til player_name hvis kolonnen finnes
        insertData.player_name = playerName.trim();

        let { data, error } = await supabase
          .from("submissions")
          .insert([insertData])
          .select()
          .single();

        // Hvis feil pga. player_name kolonne mangler, prøv uten
        if (error && (error.message.includes("player_name") || error.code === "42703")) {
          const { data: retryData, error: retryError } = await supabase
            .from("submissions")
            .insert([
              {
                coupon_id: coupon.id,
                device_id: deviceId,
                answers,
              },
            ])
            .select()
            .single();
          
          data = retryData;
          error = retryError;
        }

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Du har allerede levert denne kupongen.",
              status: "info",
              duration: 2500,
              isClosable: true,
            });
            // Hent den eksisterende submissionen
            const { data: existing } = await supabase
              .from("submissions")
              .select("*")
              .eq("coupon_id", coupon.id)
              .eq("device_id", deviceId)
              .maybeSingle();
            if (existing) {
              setSubmission(existing);
              setAnswers(existing.answers || {});
            }
          } else {
            throw error;
          }
          return;
        }

        if (data) {
          setSubmission(data);
          // Lagre i localStorage
          const submittedCoupons = loadFromStorage<number[]>("submittedCoupons", []);
          saveToStorage("submittedCoupons", [...submittedCoupons, coupon.id]);
        }

        toast({
          title: "Kupong levert!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      console.error("Feil ved lagring:", err);
      toast({
        title: "Kunne ikke lagre kupongen.",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Slett submission
  const handleDelete = async () => {
    if (!submission) return;

    if (!canEditOrDelete()) {
      toast({
        title: "Ikke mulig å slette",
        description: "Du kan ikke slette mindre enn 5 minutter før fristen.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submission.id);

    if (error) {
      console.error("Feil ved sletting:", error);
      toast({
        title: "Kunne ikke slette kupongen.",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSubmission(null);
    setAnswers({});
    
    // Fjern fra localStorage
    const submittedCoupons = loadFromStorage<number[]>("submittedCoupons", []);
    saveToStorage(
      "submittedCoupons",
      submittedCoupons.filter((id) => id !== coupon.id)
    );

    toast({
      title: "Kupong slettet.",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  if (isLoading) {
    return (
      <Box p={6}>
        <Text>Laster inn kupong...</Text>
      </Box>
    );
  }

  const isBeforeDeadline = new Date(coupon.deadline) > new Date();
  const canEdit = canEditOrDelete();
  const hasSubmitted = submission !== null;

  return (
    <Box p={6}>
      <HStack mb={4} justify="space-between">
        <Heading>{coupon.title}</Heading>
        <Button variant="ghost" onClick={onBack}>
          ← Tilbake til kuponger
        </Button>
      </HStack>
      
      <Text mb={2} color="gray.600">
        Frist: {new Date(coupon.deadline).toLocaleString("no-NO")}
      </Text>

      {!isBeforeDeadline && (
        <Text color="red.500" fontWeight="medium" mb={4}>
          Fristen har gått ut – kupongen er stengt.
        </Text>
      )}

      {hasSubmitted && !canEdit && isBeforeDeadline && (
        <Box mb={4} p={3} bg="yellow.50" borderRadius="md" borderWidth="1px" borderColor="yellow.200">
          <Text color="yellow.800" fontSize="sm">
            ⚠️ Du kan ikke lenger redigere eller slette denne kupongen. Det er mindre enn 5 minutter til fristen.
          </Text>
        </Box>
      )}

      {hasSubmitted && canEdit && (
        <Box mb={4} p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <Text color="blue.800" fontSize="sm">
            ℹ️ Du har levert denne kupongen. Du kan redigere eller slette helt frem til 5 minutter før fristen.
          </Text>
        </Box>
      )}

      {/* Navn-felt */}
      {isBeforeDeadline && (
        <FormControl mb={6} isRequired>
          <FormLabel>Navnet ditt</FormLabel>
          <Input
            placeholder="Skriv inn navnet ditt"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxW="400px"
            isDisabled={hasSubmitted && !canEdit}
            bg="white"
          />
        </FormControl>
      )}

      <VStack align="stretch" spacing={6} mt={6}>
        {questions.length === 0 ? (
          <Text color="gray.500">Ingen spørsmål i denne kupongen enda.</Text>
        ) : (
          questions.map((q) => (
            <Box key={q.id} p={4} bg="gray.50" borderRadius="md" shadow="sm">
              <Text fontWeight="semibold" mb={2}>
                {q.text}
              </Text>
              <RadioGroup
                onChange={(val) => handleAnswer(q.id, val)}
                value={answers[q.id] || ""}
              >
                <Stack>
                  {q.options.map((opt, i) => (
                    <Radio
                      key={i}
                      value={opt}
                      isDisabled={
                        !isBeforeDeadline ||
                        (hasSubmitted && !canEdit)
                      }
                    >
                      {opt}
                    </Radio>
                  ))}
                </Stack>
              </RadioGroup>
            </Box>
          ))
        )}
      </VStack>

      {isBeforeDeadline && (
        <HStack mt={6} spacing={4}>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={hasSubmitted && !canEdit}
          >
            {hasSubmitted ? "Oppdater kupong" : "Send inn kupong"}
          </Button>
          
          {hasSubmitted && canEdit && (
            <Button colorScheme="red" variant="outline" onClick={handleDelete}>
              Slett kupong
            </Button>
          )}
        </HStack>
      )}

      {hasSubmitted && !canEdit && isBeforeDeadline && (
        <Box mt={6} p={3} bg="green.50" borderRadius="md">
          <Text color="green.700">✅ Du har levert denne kupongen.</Text>
        </Box>
      )}
    </Box>
  );
}
