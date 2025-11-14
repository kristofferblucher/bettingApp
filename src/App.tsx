import { useState } from "react";
import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import AdminGate from "./components/Admin/AdminGate";
import ActiveCouponList from "./components/User/ActiveCouponList";
import ActiveCouponView from "./components/User/ActiveCouponView";
import ResultsCouponList from "./components/Result/ResultsCouponList";
import ResultsView from "./components/Result/ResultsView";
import StatsView from "./components/Stats/StatsView";
import type { Coupon } from "./interfaces/interfaces";

function App() {
  const [view, setView] = useState<"admin" | "coupon" | "stats" | "results">("coupon");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedResultCoupon, setSelectedResultCoupon] = useState<Coupon | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCouponSelect = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
  };

  const handleBackToList = () => {
    setSelectedCoupon(null);
    // Trigger refresh av kuponglisten
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResultCouponSelect = (coupon: Coupon) => {
    setSelectedResultCoupon(coupon);
  };

  const handleBackToResultList = () => {
    setSelectedResultCoupon(null);
  };

  return (
    <Box bg="gray.50" minH="100vh" p={2}>
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} pl={6} pr={6} >
          <Button
            colorScheme={view === "coupon" ? "blue" : "gray"}
            onClick={() => {
              setView("coupon");
              setSelectedCoupon(null);
            }}
          >

            
            Kupong
          </Button>
          <Button
            colorScheme={view === "stats" ? "blue" : "gray"}
            onClick={() => setView("stats")}
          >
            Statistikk
          </Button>
          <Button
            colorScheme={view === "results" ? "blue" : "gray"}
            onClick={() => {
              setView("results");
              setSelectedResultCoupon(null);
            }}
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
        {view === "coupon" && (
          <>
            {!selectedCoupon ? (
              <ActiveCouponList onSelect={handleCouponSelect} refreshTrigger={refreshTrigger} />
            ) : (
              <ActiveCouponView coupon={selectedCoupon} onBack={handleBackToList} />
            )}
          </>
        )}
        {view === "stats" && <StatsView />}
        {view === "results" && (
          <>
            {!selectedResultCoupon ? (
              <ResultsCouponList onSelect={handleResultCouponSelect} />
            ) : (
              <ResultsView coupon={selectedResultCoupon} onBack={handleBackToResultList} />
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}

export default App;

