// ============================================
// DATABASE MODELS - Objektstrukturer fra DB
// ============================================

export interface Coupon {
  id: number;
  title: string;
  deadline: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  coupon_id?: number;
}

export interface Submission {
  id: number;
  coupon_id: number;
  device_id: string;
  player_name?: string;
  answers: Record<number, string>;
  created_at: string;
  is_winner?: boolean;
}

export interface PlayerScore {
  name: string;
  correct: number;
  total: number;
  answers: Record<string, string>;
}

// ============================================
// COMPONENT PROPS - Props for komponenter
// ============================================

export interface CouponMakerProps {
  couponId: string;
  onQuestionAdded?: () => void;
}

export interface AdminViewProps {
  coupon: { id: string; title: string };
  onBack: () => void;
}

export interface ActiveCouponViewProps {
  coupon: Coupon;
  onBack: () => void;
}

export interface ActiveCouponListProps {
  onSelect: (coupon: Coupon) => void;
  refreshTrigger?: number;
}
