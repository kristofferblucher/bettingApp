import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { supabase } from "../../database/supabaseClient";
import { useRef } from "react";
import type { Coupon } from "../../interfaces/interfaces";

export default function AdminHome({ onSelect }: { onSelect: (coupon: Coupon) => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();

  // 🔹 Hent kuponger
  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: "Kunne ikke hente kuponger",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      setCoupons(data || []);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // 🔹 Opprett ny kupong
  const createCoupon = async () => {
    if (!newTitle.trim() || !newDeadline) {
      toast({
        title: "Ufullstendig informasjon",
        description: "Skriv inn navn og velg en frist.",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const localDate = new Date(newDeadline); 
    const deadlineUTC = localDate.toISOString(); 
    
    const { data, error } = await supabase
      .from("coupons")
      .insert([{ title: newTitle.trim(), deadline: deadlineUTC }])
      .select()
      .single();

    if (error) {
      console.error("Feil ved oppretting av kupong:", error);
      toast({
        title: "Kunne ikke lage kupong",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: "Kupong opprettet!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });

    onClose();
    setNewTitle("");
    setNewDeadline("");
    
    // Oppdater listen
    await fetchCoupons();
    
    onSelect(data); // 👉 åpner AdminView for den nye kupongen
  };

  // 🔹 Slett kupong
  const handleDeleteClick = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;

    console.log("Forsøker å slette kupong:", couponToDelete);

    try {
      // Slett kupong (cascade vil slette relaterte spørsmål, submissions og resultater)
      const { data, error, count } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponToDelete.id)
        .select();

      console.log("Delete response:", { data, error, count });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn("Ingen rader ble slettet. Sjekk RLS policies eller ID-match.");
        throw new Error("Kunne ikke slette kupongen. Sjekk tilganger eller prøv på nytt.");
      }

      toast({
        title: "Kupong slettet",
        description: `"${couponToDelete.title}" er slettet.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Oppdater listen
      await fetchCoupons();
    } catch (err: any) {
      console.error("Feil ved sletting:", err);
      toast({
        title: "Kunne ikke slette kupong",
        description: err.message || "Ukjent feil",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onDeleteClose();
      setCouponToDelete(null);
    }
  };

  return (
    <Box p={2}>
      <Heading size="lg" mb={4}>
        🧑‍💼 Adminpanel
      </Heading>

      <VStack align="stretch" spacing={4}>
        <Button colorScheme="blue" alignSelf="flex-start" onClick={onOpen}>
          ➕ Lag ny kupong
        </Button>

        {coupons.length === 0 ? (
          <Text color="gray.500">Ingen kuponger enda.</Text>
        ) : (
          coupons.map((c) => (
            <HStack
              key={c.id}
              justify="space-between"
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg="gray.50"
            >
              <Box>
                <Text fontWeight="bold">{c.title}</Text>
                <Text fontSize="sm" color="gray.600">
                  Frist: {new Date(c.deadline).toLocaleString("no-NO")}
                </Text>
              </Box>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => onSelect(c)}
                >
                  ✏️ Åpne kupong
                </Button>
                <IconButton
                  aria-label="Slett kupong"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleDeleteClick(c)}
                />
              </HStack>
            </HStack>
          ))
        )}
      </VStack>

      {/*  Modal for ny kupong */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Lag ny kupong</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Input
                placeholder="Navn på kupong"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
              <Button colorScheme="blue" onClick={createCoupon}>
                Opprett kupong
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 🗑️ Bekreftelsesdialog for sletting */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef as any}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Slett kupong
            </AlertDialogHeader>

            <AlertDialogBody>
              Er du sikker på at du vil slette <strong>"{couponToDelete?.title}"</strong>?
              <br />
              <br />
              Dette vil permanent slette kupongen og alle tilhørende spørsmål, fasit og innleveringer.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Avbryt
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Slett
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
