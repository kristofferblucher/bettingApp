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
} from "@chakra-ui/react";
import { supabase } from "../../database/supabaseClient";

interface Coupon {
  id: string;
  title: string;
  deadline: string;
}

export default function AdminHome({ onSelect }: { onSelect: (coupon: Coupon) => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // 🔹 Hent kuponger
  useEffect(() => {
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

    const { data, error } = await supabase
      .from("coupons")
      .insert([{ title: newTitle.trim(), deadline: newDeadline }])
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
    onSelect(data); // 👉 åpner AdminView for den nye kupongen
  };

  return (
    <Box p={6}>
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
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => onSelect(c)}
              >
                ✏️ Åpne kupong
              </Button>
            </HStack>
          ))
        )}
      </VStack>

      {/* 🧱 Modal for ny kupong */}
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
    </Box>
  );
}
