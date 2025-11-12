import { useEffect, useState, useRef } from "react";
import { supabase } from "../../database/supabaseClient";
import { 
  Box, 
  Button, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Badge,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import type { Coupon, ActiveCouponListProps } from "../../interfaces/interfaces";
import { getDeviceId } from "../../utils/deviceUtils";
import { canEditOrDelete } from "../../utils/userUtils";
import { saveToStorage, loadFromStorage } from "../../utils/storage";

export default function ActiveCouponList({ onSelect, refreshTrigger = 0 }: ActiveCouponListProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [submittedCouponIds, setSubmittedCouponIds] = useState<Set<number>>(new Set());
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const deviceId = getDeviceId();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .gt("deadline", new Date().toISOString())
      .order("deadline", { ascending: true });
    if (!error && data) {
      setCoupons(data);
      
      // Hent submissions for denne enheten
      const couponIds = data.map((c) => c.id);
      const { data: submissions } = await supabase
        .from("submissions")
        .select("coupon_id")
        .eq("device_id", deviceId)
        .in("coupon_id", couponIds);
      
      if (submissions) {
        const submittedIds = new Set(submissions.map((s) => s.coupon_id));
        setSubmittedCouponIds(submittedIds);
      }
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [deviceId, refreshTrigger]);

  const handleDeleteClick = (coupon: Coupon) => {
    if (!canEditOrDelete(coupon.deadline)) {
      toast({
        title: "Ikke mulig å slette",
        description: "Du kan ikke slette mindre enn 5 minutter før fristen.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setCouponToDelete(coupon);
    onOpen();
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;

    try {
      // Finn submission for denne kupongen
      const { data: submissions } = await supabase
        .from("submissions")
        .select("id")
        .eq("device_id", deviceId)
        .eq("coupon_id", couponToDelete.id);

      if (!submissions || submissions.length === 0) {
        toast({
          title: "Ingen submission funnet",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
        onClose();
        return;
      }

      // Slett submission
      const { error } = await supabase
        .from("submissions")
        .delete()
        .eq("id", submissions[0].id);

      if (error) throw error;

      // Fjern fra localStorage
      const submittedCoupons = loadFromStorage<number[]>("submittedCoupons", []);
      saveToStorage(
        "submittedCoupons",
        submittedCoupons.filter((id) => id !== couponToDelete.id)
      );

      toast({
        title: "Kupong slettet",
        description: "Ditt svar er fjernet.",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Oppdater listen
      await fetchCoupons();
    } catch (err: any) {
      console.error("Feil ved sletting:", err);
      toast({
        title: "Kunne ikke slette",
        description: err.message || "Ukjent feil",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onClose();
      setCouponToDelete(null);
    }
  };

  if (coupons.length === 0) {
    return <Text color="gray.500">Ingen aktive kuponger akkurat nå.</Text>;
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="md">🧾 Kuponger du kan tippe på:</Heading>
      {coupons.map((c) => {
        const isSubmitted = submittedCouponIds.has(c.id);
        return (
          <Box
            key={c.id}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg={isSubmitted ? "green.50" : "white"}
            borderColor={isSubmitted ? "green.200" : "gray.200"}
          >
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="bold">{c.title}</Text>
              {isSubmitted && (
                <Badge colorScheme="green">Levert</Badge>
              )}
            </HStack>
            <Text color="gray.600" mb={3}>
              Frist: {new Date(c.deadline).toLocaleString("no-NO")}
            </Text>
            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme={isSubmitted ? "blue" : "blue"}
                variant={isSubmitted ? "outline" : "solid"}
                onClick={() => onSelect(c)}
              >
                {isSubmitted ? "Se/Rediger kupong" : "Åpne kupong"}
              </Button>
              {isSubmitted && (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => handleDeleteClick(c)}
                >
                  Slett svar
                </Button>
              )}
            </HStack>
          </Box>
        );
      })}

      {/* Bekreftelsesdialog for sletting */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef as any}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Slett svar
            </AlertDialogHeader>

            <AlertDialogBody>
              Er du sikker på at du vil slette ditt svar for <strong>"{couponToDelete?.title}"</strong>?
              <br />
              <br />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Avbryt
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Slett
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
