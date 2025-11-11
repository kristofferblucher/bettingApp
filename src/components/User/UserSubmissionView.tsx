import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { supabase } from "../../database/supabaseClient";
import { getDeviceId } from "../../utils/deviceUtils";
import type { Question, Coupon, Submission } from "../../interfaces/interfaces";




export default function UserSubmissionView({ coupon }: { coupon: Coupon }) {
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();
    const deviceId = getDeviceId();
  
    const isBeforeDeadline = new Date(coupon.deadline) > new Date();
  
    // Hent brukerens submission + spørsmål
    useEffect(() => {
      const fetchData = async () => {
        const [{ data: sData }, { data: qData }] = await Promise.all([
          supabase
            .from("submissions")
            .select("*")
            .eq("coupon_id", coupon.id)
            .eq("device_id", deviceId)
            .maybeSingle(),
          supabase
            .from("questions")
            .select("*")
            .eq("coupon_id", coupon.id)
            .order("id", { ascending: true }),
        ]);
  
        if (sData) setSubmission(sData);
        if (qData) setQuestions(qData);
        setIsLoading(false);
      };
  
      fetchData();
    }, [coupon.id, deviceId]);
  
    // Slett submission
    const handleDelete = async () => {
      const { error } = await supabase
        .from("submissions")
        .delete()
        .eq("id", submission?.id);
  
      if (error) {
        console.error("Feil ved sletting:", error);
        toast({
          title: "Kunne ikke slette kupongen.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
  
      setSubmission(null);
      toast({
        title: "Kupong slettet.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    };
  
    // Rediger (du kan lenke til ActiveCouponView i edit-modus)
    const handleEdit = () => {
      // Her kan du for eksempel navigere tilbake til ActiveCouponView
      // med en query-param: ?edit=true
      toast({
        title: "Redigeringsmodus aktivert.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    };
  
    if (isLoading) {
      return <Text>Laster inn svar...</Text>;
    }
  
    if (!submission) {
      return (
        <Text color="gray.600">
          Du har ikke levert denne kupongen ennå.
        </Text>
      );
    }
  
    return (
      <Box p={4} bg="gray.50" borderRadius="md" shadow="sm">
        <Heading size="md" mb={3}>
          Dine svar
        </Heading>
  
        <VStack align="stretch" spacing={3}>
          {questions.map((q) => (
            <Box key={q.id}>
              <Text fontWeight="semibold">{q.text}</Text>
              <Text color="blue.600">
                {submission.answers[q.id] ?? "Ikke besvart"}
              </Text>
            </Box>
          ))}
        </VStack>
  
        {isBeforeDeadline ? (
          <Box mt={4}>
            <Button colorScheme="blue" mr={3} onClick={handleEdit}>
              Rediger
            </Button>
            <Button colorScheme="red" variant="outline" onClick={handleDelete}>
              Slett
            </Button>
          </Box>
        ) : (
          <Text mt={4} color="red.500" fontWeight="medium">
            Fristen har gått ut – kupongen kan ikke redigeres.
          </Text>
        )}
      </Box>
    );
  }