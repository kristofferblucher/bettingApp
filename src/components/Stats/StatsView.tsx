import { useState } from "react";
import { Box, Button, HStack, VStack } from "@chakra-ui/react";
import MyStatsView from "./MyStatsView";
import GlobalStatsView from "./GlobalStatsView";

export default function StatsView() {
  const [activeView, setActiveView] = useState<"my" | "global">("my");

  return (
    <Box bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch">
        {/* Toggle-knapper */}
        <HStack spacing={4} justify="center" pt={6}>
          <Button
            colorScheme={activeView === "my" ? "blue" : "gray"}
            onClick={() => setActiveView("my")}
            size="lg"
          >
            Min statistikk
          </Button>
          <Button
            colorScheme={activeView === "global" ? "blue" : "gray"}
            onClick={() => setActiveView("global")}
            size="lg"
          >
            Spillstatistikk
          </Button>
        </HStack>

        {/* Conditional rendering av valgt visning */}
        {activeView === "my" && <MyStatsView />}
        {activeView === "global" && <GlobalStatsView />}
      </VStack>
    </Box>
  );
}
