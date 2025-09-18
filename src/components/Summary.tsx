import { useEffect, useMemo, useState } from "react";
import type {
  ContributorData,
  ExpenseData,
  PaymentData,
  ResidentData,
} from "../types/types";

type Tally = {
  [residentId: number]: {
    [otherResidentId: number]: number;
  };
};

const formatPHP = (n: number | string) => {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v as number)) return "₱0";
  try {
    return (v as number).toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    });
  } catch {
    return `₱${v}`;
  }
};

const Summary = ({
  expensesData,
  contributorsData,
  residentsData,
  paymentsData,
}: {
  expensesData: ExpenseData[];
  contributorsData: ContributorData[];
  residentsData: ResidentData[];
  paymentsData: PaymentData[];
}) => {
  const [oweTable, setOweTable] = useState<Tally>({});

  // Compute pairwise balances
  useEffect(() => {
    if (residentsData.length === 0) {
      setOweTable({});
      return;
    }

    const tally: Tally = {};

    // Initialize matrix with zeros (excluding self)
    residentsData.forEach((resident) => {
      tally[resident.id] = {};
      residentsData.forEach((otherResident) => {
        if (otherResident.id !== resident.id) {
          tally[resident.id][otherResident.id] = 0;
        }
      });
    });

    // Add expenses (contributors owe the "care_of")
    expensesData.forEach((expense) => {
      const contributors = contributorsData.filter(
        (c) => c.expense_id === expense.id
      );
      const totalContributors = contributors.length || 1; // avoid div by 0
      const amountPerContributor =
        Number(expense.price || 0) / totalContributors;

      contributors.forEach((c) => {
        if (c.resident_id !== expense.care_of) {
          tally[c.resident_id][expense.care_of] += amountPerContributor;
          tally[expense.care_of][c.resident_id] -= amountPerContributor;
        }
      });
    });

    // Apply payments (reduce what paid_by owes to received_by)
    paymentsData.forEach((payment) => {
      const paidBy = payment.paid_by;
      const receivedBy = payment.received_by;
      const amount = Number(payment.amount || 0);

      if (paidBy !== receivedBy) {
        tally[paidBy][receivedBy] -= amount;
        tally[receivedBy][paidBy] += amount;
      }
    });

    // Strip ~zero values to keep the UI clean
    Object.keys(tally).forEach((a) => {
      Object.keys(tally[Number(a)]).forEach((b) => {
        const v = Number(tally[Number(a)][Number(b)].toFixed(2));
        if (v === 0) delete tally[Number(a)][Number(b)];
      });
      if (Object.keys(tally[Number(a)]).length === 0) delete tally[Number(a)];
    });

    setOweTable(tally);
  }, [expensesData, contributorsData, residentsData, paymentsData]);

  // Flatten rows for desktop table: only keep positive amounts (A owes B)
  const tableRows = useMemo(() => {
    const rows: { fromId: number; toId: number; amount: number }[] = [];
    Object.entries(oweTable).forEach(([fromIdStr, toMap]) => {
      const fromId = Number(fromIdStr);
      Object.entries(toMap).forEach(([toIdStr, amount]) => {
        if (amount > 0.009) {
          rows.push({ fromId, toId: Number(toIdStr), amount });
        }
      });
    });
    // Optional: sort by amount desc
    rows.sort((a, b) => b.amount - a.amount);
    return rows;
  }, [oweTable]);

  const nameOf = (id: number) =>
    residentsData.find((r) => r.id === id)?.nickname ?? `#${id}`;

  const hasAnyBalances = tableRows.length > 0;

  return (
    <section id="summary" className="px-3 py-4 scroll-mt-28">
      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-center gap-3">
        <div className="h-9 w-9">
          <svg
            viewBox="0 0 64 64"
            role="img"
            aria-label="Summary"
            className="h-9 w-9"
          >
            <defs>
              <linearGradient id="sumGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="url(#sumGrad)" />
            <path
              d="M20 32h24M32 20v24"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Summary
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Balances between residents
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyBalances && (
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-center shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            🎉 All settled! No outstanding balances.
          </p>
        </div>
      )}

      {/* Desktop table (md+) */}
      {hasAnyBalances && (
        <div className="hidden md:block mx-auto max-w-4xl overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 rounded-2xl border border-slate-200/70 bg-white/80 text-left shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <thead>
              <tr className="bg-slate-50/70 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                <th className="px-4 py-3 text-sm font-semibold">Debtor</th>
                <th className="px-4 py-3 text-sm font-semibold">Creditor</th>
                <th className="px-4 py-3 text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr
                  key={`${row.fromId}-${row.toId}`}
                  className={`${
                    idx % 2
                      ? "bg-white/60 dark:bg-slate-900/40"
                      : "bg-white/80 dark:bg-slate-900/50"
                  } transition-colors hover:bg-indigo-50/40 dark:hover:bg-slate-800/60`}
                >
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                    {nameOf(row.fromId)}
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                    {nameOf(row.toId)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {formatPHP(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards (<md): grouped per resident like your original */}
      {hasAnyBalances && (
        <div className="md:hidden mx-auto max-w-4xl space-y-4">
          {residentsData.map((resident) => {
            const map = oweTable[resident.id];
            if (!map || Object.keys(map).length === 0) return null;

            return (
              <div
                key={resident.id}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
              >
                <h4 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                  {resident.nickname}
                </h4>

                <ul className="space-y-1 text-sm">
                  {Object.entries(map).map(([otherIdStr, amount]) => {
                    const otherId = Number(otherIdStr);
                    const otherName = nameOf(otherId);

                    // Positive => this resident owes; Negative => this resident collects
                    const owes = amount > 0.009;
                    if (!owes && amount > -0.009) return null; // ignore ~zero

                    return (
                      <li key={otherIdStr}>
                        {owes ? "To pay" : "To collect"}{" "}
                        <strong
                          className={
                            owes
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {formatPHP(Math.abs(amount))}
                        </strong>{" "}
                        {owes ? "to" : "from"}{" "}
                        <strong>{otherName}</strong>.
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Summary;