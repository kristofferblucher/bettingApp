export interface Coupon {
    id: number;
    title: string;
    deadline: string;
  }

export interface Question {
    id: number;
    text: string;
    options: string[];
  }

  
export interface Submission {
    id: number;
    coupon_id: number;
    device_id: string;
    answers: Record<number, string>;
    created_at: string;
  }

  