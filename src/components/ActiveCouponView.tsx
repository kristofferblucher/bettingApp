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
} from "@chakra-ui/react";
import { supabase } from "../database/supabaseClient";
import { getDeviceId } from "../utils/deviceUtils";
import type { Question, Coupon } from "../interfaces/interfaces";


export default function ActiveCouponView() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const toast = useToast();
  const deviceId = getDeviceId();

  // Hent aktiv kupong
  useEffect(() => {
    const fetchCoupon = async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .gt("deadline", new Date().toISOString())
        .order("deadline", { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error("Feil ved henting av kupong:", error);
        return;
      }

      if (data) {
        setCoupon(data);
      }
    };

    fetchCoupon();
  }, []);

  // Hent spørsmål og evt. tidligere submission
  useEffect(() => {
    if (!coupon) return;

    const fetchData = async () => {
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
        setHasSubmitted(true);
      }
    };

    fetchData();
  }, [coupon]);

  // Endre svar for et spørsmål
  const handleAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Send inn svar
  const handleSubmit = async () => {
    if (hasSubmitted) {
      toast({
        title: "Du har allerede levert.",
        status: "info",
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

    const { error } = await supabase.from("submissions").insert([
      {
        coupon_id: coupon?.id,
        device_id: deviceId,
        answers,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Du har allerede levert denne kupongen.",
          status: "info",
          duration: 2500,
          isClosable: true,
        });
      } else {
        console.error("Feil ved innsending:", error);
        toast({
          title: "Kunne ikke sende inn kupongen.",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      return;
    }

    setHasSubmitted(true);
    toast({
      title: "Kupong levert!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  if (!coupon) {
    return <Text>Laster inn kupong...</Text>;
  }

  const isBeforeDeadline = new Date(coupon.deadline) > new Date();

  return (
    <Box p={6}>
      <Heading mb={4}>{coupon.title}</Heading>
      <Text mb={2} color="gray.600">
        Frist: {new Date(coupon.deadline).toLocaleString("no-NO")}
      </Text>

      {!isBeforeDeadline && (
        <Text color="red.500" fontWeight="medium">
          Fristen har gått ut – kupongen er stengt.
        </Text>
      )}

      <VStack align="stretch" spacing={6} mt={6}>
        {questions.map((q) => (
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
                  <Radio key={i} value={opt} isDisabled={!isBeforeDeadline || hasSubmitted}>
                    {opt}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </Box>
        ))}
      </VStack>

      {isBeforeDeadline && !hasSubmitted && (
        <Button mt={6} colorScheme="blue" onClick={handleSubmit}>
          Send inn kupong
        </Button>
      )}

      {hasSubmitted && (
        <Box mt={6} p={3} bg="green.50" borderRadius="md">
          <Text color="green.700">✅ Du har levert denne kupongen.</Text>
        </Box>
      )}
    </Box>
  );
}
