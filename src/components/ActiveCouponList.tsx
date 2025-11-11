import { useEffect, useState } from "react";
import { supabase } from "../database/supabaseClient";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

interface Coupon {
  id: number;
  title: string;
  deadline: string;
}

export default function ActiveCouponList({ onSelect }: { onSelect: (coupon: Coupon) => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .gt("deadline", new Date().toISOString())
        .order("deadline", { ascending: true });
      if (!error && data) setCoupons(data);
    };
    fetchCoupons();
  }, []);

  if (coupons.length === 0) {
    return <Text color="gray.500">Ingen aktive kuponger akkurat nå.</Text>;
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="md">🧾 Aktive kuponger</Heading>
      {coupons.map((c) => (
        <Box key={c.id} p={4} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold">{c.title}</Text>
          <Text color="gray.600">
            Frist: {new Date(c.deadline).toLocaleString("no-NO")}
          </Text>
          <Button mt={2} colorScheme="blue" onClick={() => onSelect(c)}>
            Åpne kupong
          </Button>
        </Box>
      ))}
    </VStack>
  );
}
