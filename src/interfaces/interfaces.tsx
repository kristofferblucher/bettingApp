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
  nt_match_id?: string;  // Kobler til NT match hvis det er NT-spørsmål
  option_points?: number[];  // Poeng per alternativ
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
  points: number;
}

// ============================================
// COMPONENT PROPS - Props for komponenter
// ============================================

export interface CouponMakerProps {
  couponId: number;
  onQuestionAdded?: () => void;
}

export interface AdminViewProps {
  coupon: Coupon;
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

// ============================================
// NORSK TIPPING - NT Data Types
// ============================================

// NT Match data
export interface NTMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
}

// NT Odds for en kamp
export interface NTOdds {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
}

// Kombinert match med odds og poeng
export interface NTMatchWithPoints {
  match: NTMatch;
  odds: NTOdds;
  points: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}
