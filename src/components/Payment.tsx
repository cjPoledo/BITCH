import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContributorData,
  ExpenseData,
  PaymentData,
  PaymentForData,
  ResidentData,
} from "../types/types";
import { useEffect, useRef, useState } from "react";
import type { SelectInstance } from "react-select";
import Select from "react-select";

const rsStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: 12,
    minHeight: 42,
    borderColor: state.isFocused ? '#14b8a6' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(20,184,166,0.15)' : 'none',
    ':hover': { borderColor: state.isFocused ? '#14b8a6' : '#cbd5e1' },
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({ ...base, zIndex: 9999, borderRadius: 12, overflow: 'hidden' }),
} as const;

const Payment = ({
  supabase,
  paymentsData,
  setPaymentsData,
  paymentForData,
  setPaymentForData,
  residentsData,
  expensesData,
  contributorsData,
}: {
  supabase: SupabaseClient;
  paymentsData: PaymentData[];
  setPaymentsData: React.Dispatch<React.SetStateAction<PaymentData[]>>;
  paymentForData: PaymentForData[];
  setPaymentForData: React.Dispatch<React.SetStateAction<PaymentForData[]>>;
  residentsData: ResidentData[];
  expensesData: ExpenseData[];
  contributorsData: ContributorData[];
}) => {
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [newPaymentNotes, setNewPaymentNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const newPaymentPaidByRef = useRef<SelectInstance<ResidentData> | null>(null);
  const newPaymentReceivedByRef = useRef<SelectInstance<ResidentData> | null>(
    null
  );
  const newPaymentForRef = useRef<SelectInstance<ExpenseData> | null>(null);

  // Initialize Payments
  useEffect(() => {
    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("id", { ascending: false });
      if (error) {
        console.error("Error fetching payments:", error);
      } else {
        setPaymentsData(data);
      }
    };
    const fetchPaymentFor = async () => {
      const { data, error } = await supabase
        .from("payment_for")
        .select("*")
        .order("payment_id", { ascending: true });
      if (error) {
        console.error("Error fetching payment_for:", error);
      } else {
        setPaymentForData(data);
      }
    };
    fetchPayments();
    fetchPaymentFor();
  }, []);

  // Subscribe to changes in the payments & payment_for tables
  useEffect(() => {
    const paymentChannel = supabase.channel("payment-channel");
    paymentChannel
      .on(
        "postgres_changes",
        { schema: "public", event: "*", table: "payments" },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              setPaymentsData((prev) => [payload.new as PaymentData, ...prev]);
              break;
            case "DELETE":
              setPaymentsData((prev) =>
                prev.filter(
                  (payment) => payment.id !== (payload.old as PaymentData).id
                )
              );
              break;
            case "UPDATE":
              setPaymentsData((prev) =>
                prev.map((payment) =>
                  payment.id === (payload.new as PaymentData).id
                    ? (payload.new as PaymentData)
                    : payment
                )
              );
              break;
            default:
              break;
          }
        }
      )
      .subscribe();

    const paymentForChannel = supabase.channel("payment_for-channel");
    paymentForChannel
      .on(
        "postgres_changes",
        { schema: "public", event: "*", table: "payment_for" },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              setPaymentForData((prev) => [
                ...prev,
                payload.new as PaymentForData,
              ]);
              break;
            case "DELETE":
              setPaymentForData((prev) =>
                prev.filter(
                  (paymentFor) =>
                    paymentFor.expense_id !==
                      (payload.old as PaymentForData).expense_id ||
                    paymentFor.payment_id !==
                      (payload.old as PaymentForData).payment_id
                )
              );
              break;
            case "UPDATE":
              setPaymentForData((prev) =>
                prev.map((paymentFor) =>
                  paymentFor.expense_id ===
                    (payload.new as PaymentForData).expense_id &&
                  paymentFor.payment_id ===
                    (payload.new as PaymentForData).payment_id
                    ? (payload.new as PaymentForData)
                    : paymentFor
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
      paymentChannel.unsubscribe();
      paymentForChannel.unsubscribe();
    };
  }, []);

  // Helpers
  const clearNewPaymentForm = () => {
    newPaymentPaidByRef.current?.clearValue();
    newPaymentReceivedByRef.current?.clearValue();
    newPaymentForRef.current?.clearValue();
    setNewPaymentAmount(0);
    setNewPaymentNotes("");
  };

  // Add payment entry
  const addPayment = async () => {
    const paidBy = newPaymentPaidByRef.current?.getValue()[0]?.id;
    const receivedBy = newPaymentReceivedByRef.current?.getValue()[0]?.id;
    const selectedExpenses = newPaymentForRef.current?.getValue() || [];

    if (!paidBy || !receivedBy || selectedExpenses.length === 0 || newPaymentAmount <= 0) {
      return;
    }

    setIsAdding(true);
    const newPayment = {
      paid_by: paidBy,
      received_by: receivedBy,
      amount: newPaymentAmount,
      notes: newPaymentNotes,
    };

    const { data, error } = await supabase
      .from("payments")
      .insert([newPayment])
      .select();

    if (error) {
      console.error("Error adding payment:", error);
      setIsAdding(false);
      return;
    }

    const paymentInsertData = data!;
    for (const expense of selectedExpenses) {
      const { error: pfErr } = await supabase
        .from("payment_for")
        .insert([
          {
            payment_id: paymentInsertData[0].id,
            expense_id: (expense as unknown as ExpenseData).id,
          },
        ])
        .select();
      if (pfErr) console.error("Error adding payment for:", pfErr);
    }

    clearNewPaymentForm();
    setIsAdding(false);
  };

  // Delete payment entry
  const deletePayment = async (id: number) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this payment? This action cannot be undone."
    );
    if (!confirmDelete) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const handleAmountKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPayment();
    }
  };

  return (
    <section id="payment" className="px-3 py-4 scroll-mt-28">
      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-center gap-3">
        <div className="h-9 w-9">
          <svg viewBox="0 0 64 64" role="img" aria-label="Payments" className="h-9 w-9">
            <defs>
              <linearGradient id="payGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#payGrad)" />
            <path
              d="M16 24h32v16a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V24Zm4-6h24a4 4 0 0 1 4 4v2H16v-2a4 4 0 0 1 4-4Zm6 18h8a2 2 0 1 1 0 4h-8a2 2 0 1 1 0-4Z"
              fill="#fff"
              fillOpacity="0.95"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Payments</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Record reimbursements and settlements
          </p>
        </div>
      </div>

      {/* Add payment card */}
      <div className="relative z-10 mx-auto mb-6 max-w-5xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          {/* Paid by */}
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Paid By
            </label>
            <div className="relative z-50">
              <Select
                ref={newPaymentPaidByRef}
                classNamePrefix="rs"
                options={residentsData}
                placeholder="Select payer"
                getOptionLabel={(r) => r.nickname}
                getOptionValue={(r) => r.id.toString()}
                onChange={() => {
                  newPaymentForRef.current?.clearValue();
                  newPaymentReceivedByRef.current?.clearValue();
                }}
                styles={rsStyles as any}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>

          {/* Received by */}
          <div className="lg:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Received By
            </label>
            <div className="relative z-50">
              <Select
                ref={newPaymentReceivedByRef}
                classNamePrefix="rs"
                options={residentsData}
                placeholder="Select receiver"
                getOptionLabel={(r) => r.nickname}
                getOptionValue={(r) => r.id.toString()}
                filterOption={(option) =>
                  option.data.id !== newPaymentPaidByRef.current?.getValue()[0]?.id
                }
                styles={rsStyles as any}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="lg:col-span-1">
            <label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                ₱
              </span>
              <input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                onKeyDown={handleAmountKeyDown}
                className="w-full rounded-xl border border-slate-200 bg-white px-8 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment for */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Payment For
            </label>
            <div className="relative z-50">
              <Select
                ref={newPaymentForRef}
                classNamePrefix="rs"
                isMulti
                options={expensesData}
                placeholder="Choose matching expenses"
                getOptionLabel={(e) => `${e.item} — ₱${e.price}`}
                getOptionValue={(e) => e.id.toString()}
                filterOption={(option) => {
                  const payer = newPaymentPaidByRef.current?.getValue()[0]?.id;
                  const receiver = newPaymentReceivedByRef.current?.getValue()[0]?.id;
                  const exp = option.data as ExpenseData;
                  return (
                    !!payer &&
                    !!receiver &&
                    exp.care_of === receiver &&
                    contributorsData.some(
                      (c) => c.expense_id === exp.id && c.resident_id === payer
                    )
                  );
                }}
                styles={rsStyles as any}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only expenses where the payer was a contributor and the receiver was the
              “care of” are shown.
            </p>
          </div>

          {/* Notes */}
          <div className="lg:col-span-1">
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Notes
            </label>
            <input
              id="notes"
              type="text"
              value={newPaymentNotes}
              onChange={(e) => setNewPaymentNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={isAdding}
            onClick={addPayment}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md
                       hover:from-teal-600 hover:to-indigo-600
                       focus:outline-none focus:ring-4 focus:ring-indigo-400/30
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : null}
            {isAdding ? "Adding..." : "Add Payment"}
          </button>
        </div>
      </div>

      {/* Payments table */}
      <div className="relative z-0 mx-auto max-w-5xl overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 rounded-2xl border border-slate-200/70 bg-white/70 text-left shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <thead>
            <tr className="bg-slate-50/70 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              <th className="px-4 py-3 text-sm font-semibold">Date Added</th>
              <th className="px-4 py-3 text-sm font-semibold">Paid By</th>
              <th className="px-4 py-3 text-sm font-semibold">Received By</th>
              <th className="px-4 py-3 text-sm font-semibold">Amount</th>
              <th className="px-4 py-3 text-sm font-semibold">Payment For</th>
              <th className="px-4 py-3 text-sm font-semibold">Notes</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {paymentsData.map((payment, idx) => (
              <tr
                key={payment.id}
                className={`transition-colors hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 ${
                  idx % 2
                    ? "bg-white/60 dark:bg-slate-900/40"
                    : "bg-white/80 dark:bg-slate-900/50"
                }`}
              >
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {new Date(payment.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                  {residentsData.find((r) => r.id === payment.paid_by)?.nickname}
                </td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                  {residentsData.find((r) => r.id === payment.received_by)?.nickname}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  ₱{payment.amount}
                </td>
                <td className="px-4 py-3">
                  {paymentForData
                    .filter((pf) => pf.payment_id === payment.id)
                    .map((pf, index, array) => (
                      <a
                        key={pf.expense_id}
                        href={`#expense-${pf.expense_id}`}
                        className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:no-underline dark:text-indigo-400"
                      >
                        {expensesData.find((e) => e.id === pf.expense_id)?.item}
                        {index < array.length - 1 && ", "}
                      </a>
                    ))}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {payment.notes}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/30 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                    onClick={() => deletePayment(payment.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {paymentsData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No payments yet. Add one above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Payment;