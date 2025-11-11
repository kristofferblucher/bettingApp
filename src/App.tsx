import { useState } from "react";
import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import AdminGate from "./components/AdminGate";
import CouponView from "./components/OldCouponView";
import ResultsView from "./components/ResultsView";

function App() {
  const [view, setView] = useState<"admin" | "coupon" | "results">("coupon");

  return (
    <Box bg="gray.50" minH="100vh" p={6}>
      <VStack spacing={6} align="stretch">
        <HStack spacing={4}>
          <Button
            colorScheme={view === "coupon" ? "blue" : "gray"}
            onClick={() => setView("coupon")}
          >
            Kupong
          </Button>
          <Button
            colorScheme={view === "results" ? "blue" : "gray"}
            onClick={() => setView("results")}
          >
            Resultater
          </Button>
          <Button
            colorScheme={view === "admin" ? "blue" : "gray"}
            onClick={() => setView("admin")}
          >
            Admin
          </Button>
        </HStack>

        {view === "admin" && <AdminGate />}
        {view === "coupon" && <CouponView />}
        {view === "results" && <ResultsView />}
      </VStack>
    </Box>
  );
}

export default App;

