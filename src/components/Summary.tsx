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
    if (contributorsData.length === 0) return;

    const tally: Tally = {};

    residentsData.forEach((resident) => {
      tally[resident.id] = {};
      residentsData.forEach((otherResident) => {
        if (otherResident.id !== resident.id) {
          tally[resident.id][otherResident.id] = 0;
        }
      });
    });

    expensesData.forEach((expense) => {
      const contributors = contributorsData.filter(
        (contributor) => contributor.expense_id === expense.id
      );
      const totalContributors = contributors.length;
      const amountPerContributor = expense.price / totalContributors;

      contributors.forEach((contributor) => {
        if (contributor.resident_id !== expense.care_of) {
          tally[contributor.resident_id][expense.care_of] +=
            amountPerContributor;
          tally[expense.care_of][contributor.resident_id] -=
            amountPerContributor;
        }
      });
    });

    paymentsData.forEach((payment) => {
      const paidBy = payment.paid_by;
      const receivedBy = payment.received_by;
      const amount = payment.amount;

      if (paidBy !== receivedBy) {
        tally[paidBy][receivedBy] -= amount;
        tally[receivedBy][paidBy] += amount;
      }
    });

    // Remove zero entries
    Object.keys(tally).forEach((residentId) => {
      Object.keys(tally[Number(residentId)]).forEach((otherResidentId) => {
        if (
          Number(
            tally[Number(residentId)][Number(otherResidentId)].toFixed(2)
          ) === 0
        ) {
          delete tally[Number(residentId)][Number(otherResidentId)];
        }
      });
    });

    // Remove empty resident entries
    Object.keys(tally).forEach((residentId) => {
      if (Object.keys(tally[Number(residentId)]).length === 0) {
        delete tally[Number(residentId)];
      }
    });

    setOweTable(tally);
  }, [expensesData, contributorsData, residentsData, paymentsData]);

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
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Summary
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Balances between residents
          </p>
        </div>
      </div>

      {/* Cards per resident */}
      {residentsData.map(
        (resident) =>
          Object.entries(oweTable).length > 0 &&
          Object.keys(oweTable).includes(resident.id.toString()) && (
            <div
              className="mx-auto mb-4 max-w-3xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 text-center shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
              key={resident.id}
            >
              <h4 className="mb-2 font-bold text-lg text-slate-800 dark:text-slate-100">
                {resident.nickname}
              </h4>
              <ul className="space-y-1 text-sm">
                {Object.entries(oweTable[resident.id]).map(
                  ([otherResidentId, amount]) => {
                    const otherResident = residentsData.find(
                      (r) => r.id === Number(otherResidentId)
                    );
                    return (
                      <li key={otherResidentId}>
                        {amount > 0 ? "To pay" : "To collect"}{" "}
                        <strong
                          className={`${
                            amount > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatPHP(Math.abs(amount))}
                        </strong>{" "}
                        {amount > 0 ? "to" : "from"}{" "}
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