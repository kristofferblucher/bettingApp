import { useState } from "react";
import AdminHome from "./AdminHome";
import AdminView from "./AdminView";

export default function AdminPanel() {
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  return (
    <>
      {!selectedCoupon && (
        <AdminHome onSelect={(coupon) => setSelectedCoupon(coupon)} />
      )}

      {selectedCoupon && (
        <AdminView
    key={selectedCoupon.id}
    coupon={selectedCoupon}
    onBack={() => setSelectedCoupon(null)} // 👈 manglet denne
  />
      )}
    </>
  );
}
