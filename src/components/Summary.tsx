import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (residentsData.length === 0) {
      setOweTable({});
      return;
    }

    const tally: Tally = {};

    // initialize pairwise matrix
    residentsData.forEach((resident) => {
      tally[resident.id] = {};
      residentsData.forEach((other) => {
        if (other.id !== resident.id) {
          tally[resident.id][other.id] = 0;
        }
      });
    });

    // expenses: contributors owe the "care_of"
    expensesData.forEach((expense) => {
      const contributors = contributorsData.filter(
        (c) => c.expense_id === expense.id
      );
      const totalContributors = contributors.length || 1; // avoid div/NaN
      const amountPerContributor =
        Number(expense.price || 0) / totalContributors;

      contributors.forEach((c) => {
        if (c.resident_id !== expense.care_of) {
          tally[c.resident_id][expense.care_of] += amountPerContributor;
          tally[expense.care_of][c.resident_id] -= amountPerContributor;
        }
      });
    });

    // payments: reduce what paid_by owes to received_by
    paymentsData.forEach((payment) => {
      const paidBy = payment.paid_by;
      const receivedBy = payment.received_by;
      const amount = Number(payment.amount || 0);

      if (paidBy !== receivedBy) {
        tally[paidBy][receivedBy] -= amount;
        tally[receivedBy][paidBy] += amount;
      }
    });

    // strip near-zero values and empty rows to keep UI clean
    Object.keys(tally).forEach((a) => {
      Object.keys(tally[Number(a)]).forEach((b) => {
        const v = Number(tally[Number(a)][Number(b)].toFixed(2));
        if (v === 0) delete tally[Number(a)][Number(b)];
      });
      if (Object.keys(tally[Number(a)]).length === 0) delete tally[Number(a)];
    });

    setOweTable(tally);
  }, [expensesData, contributorsData, residentsData, paymentsData]);

  const hasAny = Object.keys(oweTable).length > 0;

  return (
    <section id="summary" className="px-3 py-4 scroll-mt-28">
      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-center gap-3">
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
          <h3 className="text-xl font-bold text-slate-800">Summary</h3>
          <p className="text-sm text-slate-500">Balances between residents</p>
        </div>
      </div>

      {/* Empty state */}
      {!hasAny && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            🎉 All settled! No outstanding balances.
          </p>
        </div>
      )}

      {/* Cards per resident (light mode only) */}
      {residentsData.map(
        (resident) =>
          hasAny &&
          Object.keys(oweTable).includes(String(resident.id)) && (
            <div
              className="mx-auto mb-4 max-w-3xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-center shadow-sm"
              key={resident.id}
            >
              <h4 className="mb-2 text-lg font-bold text-slate-800">
                {resident.nickname}
              </h4>
              <ul className="space-y-1 text-sm">
                {Object.entries(oweTable[resident.id]).map(
                  ([otherResidentId, amount]) => {
                    const otherResident = residentsData.find(
                      (r) => r.id === Number(otherResidentId)
                    );
                    const owes = amount > 0.009; // positive => owes; negative => collects
                    return (
                      <li key={otherResidentId}>
                        {owes ? "To pay" : "To collect"}{" "}
                        <strong
                          className={
                            owes ? "text-rose-600" : "text-emerald-600"
                          }
                        >
                          {formatPHP(Math.abs(amount))}
                        </strong>{" "}
                        {owes ? "to" : "from"}{" "}
                        <strong>{otherResident?.nickname}</strong>.
                      </li>
                    );
                  }
                )}
              </ul>
            </div>
          )
      )}
    </section>
  );
};

export default Summary;