import { useState } from "react";
import { Box, Button, Input, Text, VStack, HStack } from "@chakra-ui/react";
import AdminPanel from "./AdminPanel";

export default function AdminGate() {
  const [pin, setPin] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const correctPin = "1886199820022004"; 
  const ADMIN_VERSION = "v2"; // ⚠️ Endre denne når du vil sparke ut alle admin-brukere

  const handleSubmit = () => {
    if (pin === correctPin) {
      setAuthorized(true);
      // Lagre med versjonsnummer
      localStorage.setItem(`isAdmin_${ADMIN_VERSION}`, "true");
    } else {
      alert("Feil kode!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`isAdmin_${ADMIN_VERSION}`);
    setAuthorized(false);
  };

  if (authorized || localStorage.getItem(`isAdmin_${ADMIN_VERSION}`) === "true") {
    return (
      <Box>
        {/* Logout-knapp som fungerer godt på alle skjermstørrelser */}
        <Box 
          bg="white" 
          p={{ base: 3, md: 4 }} 
          borderBottomWidth="1px" 
          borderColor="gray.200"
          position="sticky"
          top={0}
          zIndex={10}
          boxShadow="sm"
        >
          <HStack justify="space-between" align="center">
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>
              Admin Panel
            </Text>
            <Button 
              colorScheme="red" 
              variant="outline" 
              size={{ base: "sm", md: "md" }}
              onClick={handleLogout}
            >
              Logg ut
            </Button>
          </HStack>
        </Box>
        <AdminPanel />
      </Box>
    );
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
