

export type Question = {
  id: number;
  text: string;
  options: string[]; // f.eks. ["Ja", "Nei"]
};

export type Coupon = {
  id: number;
  name: string;
  questions: Question[];
};

export type Answer = {
  name: string;
  answers: Record<number, string>; // { 1: "Ja", 2: "Nei" }
};

export type PlayerScore = {
  name: string;
  correct: number;
  total: number;
  answers: Record<string, string>;
};

export type Result = Record<number, string>; // { 1: "Ja", 2: "Nei" }
