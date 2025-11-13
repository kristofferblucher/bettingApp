import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  VStack,
  Button,
  Text,
  Card,
  CardBody,
  HStack,
  Badge,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { supabase } from "../../database/supabaseClient";
import type { Coupon } from "../../interfaces/interfaces";

interface ResultsCouponListProps {
  onSelect: (coupon: Coupon) => void;
}

export default function ResultsCouponList({ onSelect }: ResultsCouponListProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsWithResults, setCouponsWithResults] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouponsWithResults();
  }, []);

  const fetchCouponsWithResults = async () => {
    setLoading(true);

    // Hent alle kuponger
    const { data: allCoupons, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .order("deadline", { ascending: false });

    if (couponError) {
      console.error("Feil ved henting av kuponger:", couponError);
      setLoading(false);
      return;
    }

    // Hent alle kuponger som har fasit (results)
    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select("coupon_id");

    if (resultsError) {
      console.error("Feil ved henting av resultater:", resultsError);
      setLoading(false);
      return;
    }

    // Lag et Set av kupong-IDer som har fasit
    const couponIdsWithResults = new Set(results?.map((r) => r.coupon_id) || []);

    // Vis ALLE kuponger (ikke filtrer)
    setCoupons(allCoupons || []);
    setCouponsWithResults(couponIdsWithResults);
    setLoading(false);
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isPastDeadline = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (coupons.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="md" color="gray.600" mb={2}>
          Ingen kuponger funnet
        </Heading>
        <Text color="gray.500">
          Det finnes ingen kuponger enda
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Resultater
      </Heading>

      <VStack spacing={4} align="stretch">
        {coupons.map((coupon) => {
          const hasPassed = isPastDeadline(coupon.deadline);
          const hasFasit = couponsWithResults.has(coupon.id);

          return (
            <Card
              key={coupon.id}
              bg={hasPassed ? "white" : "blue.50"}
              borderWidth={2}
              borderColor={hasPassed ? "gray.200" : "blue.300"}
            >
              <CardBody>
                <HStack justify="space-between" align="center">
                  <VStack align="start" spacing={1} flex="1">
                    <HStack>
                      <Heading size="md">{coupon.title}</Heading>
                      {hasFasit && (
                        <Badge colorScheme="green">Fasit lagt inn</Badge>
                      )}
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      Frist: {formatDeadline(coupon.deadline)}
                    </Text>
                  </VStack>

                  <Button
                    colorScheme="blue"
                    size="md"
                    onClick={() => onSelect(coupon)}
                  >
                    Se resultater
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          );
        })}
      </VStack>
    </Box>
  );
}

