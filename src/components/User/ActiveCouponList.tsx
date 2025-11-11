import { useEffect, useState } from "react";
import { supabase } from "../../database/supabaseClient";
import { Box, Button, Heading, Text, VStack, HStack, Badge } from "@chakra-ui/react";
import type { Coupon } from "../../interfaces/interfaces";
import { getDeviceId } from "../../utils/deviceUtils";

interface ActiveCouponListProps {
  onSelect: (coupon: Coupon) => void;
  refreshTrigger?: number;
}

export default function ActiveCouponList({ onSelect, refreshTrigger = 0 }: ActiveCouponListProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [submittedCouponIds, setSubmittedCouponIds] = useState<Set<number>>(new Set());
  const deviceId = getDeviceId();

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
            <Button
              mt={2}
              colorScheme={isSubmitted ? "blue" : "blue"}
              variant={isSubmitted ? "outline" : "solid"}
              onClick={() => onSelect(c)}
            >
              {isSubmitted ? "Se/Rediger kupong" : "Åpne kupong"}
            </Button>
          </Box>
        );
      })}
    </VStack>
  );
}
