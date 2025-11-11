import { useState } from "react";
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react";
import AdminPanel from "./AdminPanel";

export default function AdminGate() {
  const [pin, setPin] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const correctPin = "1886"; 

  const handleSubmit = () => {
    if (pin === correctPin) {
      setAuthorized(true);
      localStorage.setItem("isAdmin", "true"); // lagre for denne sesjonen
    } else {
      alert("Feil kode!");
    }
  };

  if (authorized || localStorage.getItem("isAdmin") === "true") {
    return <AdminPanel />;
  }

  return (
    <Box p={6} maxW="400px" mx="auto" textAlign="center">
      <VStack spacing={4}>
        <Text fontSize="lg" fontWeight="bold">
          🔑 Skriv inn PIN for å åpne adminpanelet
        </Text>
        <Input
          type="password"
          placeholder="PIN-kode"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxW="200px"
          textAlign="center"
        />
        <Button colorScheme="blue" onClick={handleSubmit}>
          Logg inn
        </Button>
      </VStack>
    </Box>
  );
}
