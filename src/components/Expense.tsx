import React, { useEffect, useRef, useState } from "react";
import type {
  ContributorData,
  ExpenseData,
  ResidentData,
} from "../types/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import Select, { type SelectInstance } from "react-select";

// React-Select theme to blend with Tailwind palette
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: 12,
    borderColor: state.isFocused ? '#14b8a6' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(20,184,166,0.15)' : 'none',
    ':hover': { borderColor: state.isFocused ? '#14b8a6' : '#cbd5e1' },
    backgroundColor: 'white',
    minHeight: 42,
  }),
  menu: (base: any) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? 'rgba(99,102,241,0.08)' : 'white',
    color: '#0f172a',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderRadius: 9999,
  }),
  multiValueLabel: (base: any) => ({ ...base, color: '#0f766e' }),
  multiValueRemove: (base: any) => ({ ...base, ':hover': { backgroundColor: 'rgba(20,184,166,0.2)', color: '#0f172a' } }),
} as const;

const formatPHP = (n: number | string) => {
  const v = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(v as number)) return '₱0';
  try {
    return (v as number).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });
  } catch {
    return `₱${v}`;
  }
};

const Expense = ({
  supabase,
  expensesData,
  setExpensesData,
  contributorsData,
  setContributorsData,
  residentsData,
}: {
  supabase: SupabaseClient;
  expensesData: ExpenseData[];
  setExpensesData: React.Dispatch<React.SetStateAction<ExpenseData[]>>;
  contributorsData: ContributorData[];
  setContributorsData: React.Dispatch<React.SetStateAction<ContributorData[]>>;
  residentsData: ResidentData[];
}) => {
  const [newExpenseItem, setNewExpenseItem] = useState("");
  const [newExpensePrice, setNewExpensePrice] = useState(0);
  const [newExpenseNotes, setNewExpenseNotes] = useState("");

  const newExpenseCareOfRef = useRef<SelectInstance<ResidentData> | null>(null);
  const newExpenseContributorsRef = useRef<SelectInstance<ResidentData> | null>(
    null
  );

  // Initialize Expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("id", { ascending: false });
      if (error) {
        console.error("Error fetching expenses:", error);
      } else {
        setExpensesData(data);
      }
    };
    const fetchContributors = async () => {
      const { data, error } = await supabase
        .from("contributors")
        .select("*")
        .order("expense_id", { ascending: true });
      if (error) {
        console.error("Error fetching contributors:", error);
      } else {
        setContributorsData(data);
      }
    };
    fetchExpenses();
    fetchContributors();
  }, []);

  // Subscribe to changes in the expenses table
  useEffect(() => {
    const expenseChannel = supabase.channel("expense-channel");
    expenseChannel
      .on(
        "postgres_changes",
        { schema: "public", event: "*", table: "expenses" },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              setExpensesData((prev) => [payload.new as ExpenseData, ...prev]);
              break;

            case "DELETE":
              setExpensesData((prev) =>
                prev.filter(
                  (expense) => expense.id !== (payload.old as ExpenseData).id
                )
              );
              break;

            case "UPDATE":
              setExpensesData((prev) =>
                prev.map((expense) =>
                  expense.id === (payload.new as ExpenseData).id
                    ? (payload.new as ExpenseData)
                    : expense
                )
              );
              break;

            default:
              break;
          }
        }
      )
      .subscribe();
    const contributorChannel = supabase.channel("contributor-channel");
    contributorChannel
      .on(
        "postgres_changes",
        { schema: "public", event: "*", table: "contributors" },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              setContributorsData((prev) => [
                ...prev,
                payload.new as ContributorData,
              ]);
              break;

            case "DELETE":
              setContributorsData((prev) =>
                prev.filter(
                  (contributor) =>
                    contributor.expense_id !==
                      (payload.old as ContributorData).expense_id ||
                    contributor.resident_id !==
                      (payload.old as ContributorData).resident_id
                )
              );
              break;

            case "UPDATE":
              setContributorsData((prev) =>
                prev.map((contributor) =>
                  contributor.expense_id ===
                    (payload.new as ContributorData).expense_id &&
                  contributor.resident_id ===
                    (payload.new as ContributorData).resident_id
                    ? (payload.new as ContributorData)
                    : contributor
                )
              );
              break;

            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      expenseChannel.unsubscribe();
      contributorChannel.unsubscribe();
    };
  }, []);

  // Delete Expense
  const deleteExpense = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this expense? This action cannot be undone."
    );
    if (!confirmDelete) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // Add Expense
  const addExpense = async () => {
    if (
      newExpenseItem.trim() === "" ||
      newExpensePrice <= 0 ||
      newExpenseCareOfRef.current?.getValue().length === 0 ||
      newExpenseContributorsRef.current?.getValue().length === 0
    )
      return;

    const newExpense = {
      item: newExpenseItem,
      price: newExpensePrice,
      care_of: newExpenseCareOfRef.current?.getValue()[0].id,
      notes: newExpenseNotes,
    };

    const { data, error } = await supabase
      .from("expenses")
      .insert([newExpense])
      .select();
    const expenseInsertData = data;
    const expenseInsertError = error;
    if (expenseInsertError) {
      console.error("Error adding expense:", expenseInsertError);
    } else {
      newExpenseContributorsRef.current
        ?.getValue()
        .forEach(async (contributor) => {
          const { error } = await supabase
            .from("contributors")
            .insert([
              {
                expense_id: expenseInsertData![0].id,
                resident_id: contributor.id,
              },
            ])
            .select();
          if (error) {
            console.error("Error adding contributor:", error);
          }
        });
      setNewExpenseItem("");
      setNewExpensePrice(0);
      newExpenseCareOfRef.current?.clearValue();
      newExpenseContributorsRef.current?.clearValue();
      setNewExpenseNotes("");
    }
  };

  return (
    <section id="expense" className="p-2 scroll-mt-28">
      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9">
            <svg viewBox="0 0 64 64" role="img" aria-label="Expenses" className="h-9 w-9">
              <defs>
                <linearGradient id="expGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#expGrad)" />
              <path d="M20 40h24M20 32h24M20 24h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Expenses</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track items, contributors, and notes at a glance</p>
          </div>
        </div>
      </div>

      {/* Add Expense Row (Card) */}
      <div className="relative z-10 mx-auto mb-5 max-w-5xl rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="border-b border-slate-200/60 px-4 py-3 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add a new expense</h4>
        </div>
        <div className="grid gap-3 px-4 py-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Item</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Enter item"
              value={newExpenseItem}
              onChange={(e) => setNewExpenseItem(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Price</label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="0.00"
              value={newExpensePrice}
              onChange={(e) => setNewExpensePrice(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Care of</label>
            <div className="relative z-50">
              <Select
                ref={newExpenseCareOfRef}
                options={residentsData}
                getOptionLabel={(resident) => resident.nickname}
                getOptionValue={(resident) => resident.id.toString()}
                styles={selectStyles as any}
                classNamePrefix="rs"
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Contributors</label>
            <div className="relative z-50">
              <Select
                ref={newExpenseContributorsRef}
                options={residentsData}
                getOptionLabel={(resident) => resident.nickname}
                getOptionValue={(resident) => resident.id.toString()}
                isMulti
                styles={selectStyles as any}
                classNamePrefix="rs"
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>
          <div className="md:col-span-9">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Notes</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Optional notes"
              value={newExpenseNotes}
              onChange={(e) => setNewExpenseNotes(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              type="button"
              onClick={addExpense}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-teal-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-400/30"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative z-0 mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Date Added</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Care Of</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Contributors</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {expensesData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No expenses yet. Add your first one above.
                  </td>
                </tr>
              )}
              {expensesData.map((expense) => (
                <tr key={expense.id} id={`expense-${expense.id}`} className="border-t border-slate-100/80 odd:bg-white even:bg-slate-50/60 hover:bg-teal-50/40 dark:border-slate-800 dark:odd:bg-slate-900/70 dark:even:bg-slate-900/40 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 align-top text-sm text-slate-600 dark:text-slate-300">
                    {new Date(expense.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 align-top font-medium text-slate-800 dark:text-slate-100">{expense.item}</td>
                  <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{formatPHP(expense.price)}</td>
                  <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">
                    {residentsData.find((resident) => resident.id === expense.care_of)?.nickname}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">
                    {contributorsData
                      .filter((contributor) => contributor.expense_id === expense.id)
                      .map((contributor, index, array) => (
                        <span key={contributor.resident_id}>
                          {residentsData.find((resident) => resident.id === contributor.resident_id)?.nickname}
                          {index < array.length - 1 && <span>, </span>}
                        </span>
                      ))}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{expense.notes}</td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => deleteExpense(expense.id)}
                      className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300/40 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Expense;
