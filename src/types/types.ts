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
