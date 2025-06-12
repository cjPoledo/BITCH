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
        if (tally[Number(residentId)][Number(otherResidentId)] === 0) {
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
    <section className="p-2 border rounded-2xl w-fit mx-auto" id="summary">
      <h3 className="text-center font-bold text-xl">Summary</h3>
      {residentsData.map(
        (resident) =>
          Object.entries(oweTable).length > 0 &&
          Object.keys(oweTable).includes(resident.id.toString()) && (
            <div className="p-2 text-center" key={resident.id}>
              <h4 className="font-bold text-lg">{resident.nickname}</h4>
              <ul>
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
                            amount > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          ₱{Math.abs(amount).toFixed(2)}
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
