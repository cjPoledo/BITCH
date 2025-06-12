// Types
export type ResidentData = {
  id: number;
  nickname: string;
  created_at: string;
};

export type ExpenseData = {
  id: number;
  created_at: string;
  item: string;
  price: number;
  care_of: number;
  notes: string;
};

export type ContributorData = {
  expense_id: number;
  resident_id: number;
};

export type PaymentData = {
  id: number;
  created_at: string;
  paid_by: number;
  received_by: number;
  amount: number;
  notes: string;
}

export type PaymentForData = {
  payment_id: number;
  expense_id: number;
}