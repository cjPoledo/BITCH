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

  // Subscribe to changes in the payments table
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

  return (
    <section className="p-2" id="payment">
      <h3 className="text-center font-bold text-xl">Payments</h3>
      <table className="mx-auto my-2 text-center">
        <thead>
          <tr>
            <th className="p-1">Date Added</th>
            <th className="p-1">Paid By</th>
            <th className="p-1">Received By</th>
            <th className="p-1">Amount</th>
            <th className="p-1">Payment For</th>
            <th className="p-1">Notes</th>
            <th className="p-1">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-1">-</td>
            <td className="p-1">
              <Select
                ref={newPaymentPaidByRef}
                options={residentsData}
                getOptionLabel={(resident) => {
                  return resident.nickname;
                }}
                getOptionValue={(resident) => {
                  return resident.id.toString();
                }}
                onChange={() => {
                  newPaymentForRef.current?.clearValue();
                  newPaymentReceivedByRef.current?.clearValue();
                }}
              />
            </td>
            <td className="p-1">
              <Select
                ref={newPaymentReceivedByRef}
                options={residentsData}
                getOptionLabel={(resident) => {
                  return resident.nickname;
                }}
                getOptionValue={(resident) => {
                  return resident.id.toString();
                }}
                filterOption={(option) => {
                  return (
                    option.data.id !==
                    newPaymentPaidByRef.current?.getValue()[0]?.id
                  );
                }}
              />
            </td>
            <td className="p-1">
              <input
                type="number"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                className="border"
                placeholder="Enter price"
              />
            </td>
            <td className="p-1">
              <Select
                ref={newPaymentForRef}
                options={expensesData}
                getOptionLabel={(expense) => {
                  return `${expense.item} - ₱${expense.price}`;
                }}
                getOptionValue={(expense) => {
                  return expense.id.toString();
                }}
                filterOption={(option) => {
                  return (
                    contributorsData.some(
                      (contributor) =>
                        contributor.expense_id === option.data.id &&
                        contributor.resident_id ===
                          newPaymentPaidByRef.current?.getValue()[0]?.id
                    ) &&
                    option.data.care_of ===
                      newPaymentReceivedByRef.current?.getValue()[0]?.id
                  );
                }}
                isMulti
              />
            </td>
            <td className="p-1">
              <input
                type="text"
                value={newPaymentNotes}
                onChange={(e) => setNewPaymentNotes(e.target.value)}
                className="border"
                placeholder="Enter notes"
              />
            </td>
            <td>
              <button
                type="button"
                className="m-1 px-1 border-1 hover:bg-gray-200"
              >
                Add
              </button>
            </td>
          </tr>
          {paymentsData.map((payment) => (
            <tr key={payment.id}>
              <td className="p-1">
                {new Date(payment.created_at).toLocaleString()}
              </td>
              <td className="p-1">
                {residentsData.find((r) => r.id === payment.paid_by)?.nickname}
              </td>
              <td className="p-1">
                {
                  residentsData.find((r) => r.id === payment.received_by)
                    ?.nickname
                }
              </td>
              <td className="p-1">₱{payment.amount}</td>
              <td className="p-1">
                {paymentForData
                  .filter((pf) => pf.payment_id === payment.id)
                  .map((pf, index, array) => (
                    <a
                      key={pf.expense_id}
                      href={`#expense-${pf.expense_id}`}
                      className="underline hover:no-underline"
                    >
                      {expensesData.find((e) => e.id === pf.expense_id)?.item}
                      {index < array.length - 1 && ", "}
                    </a>
                  ))}
              </td>
              <td className="p-1">{payment.notes}</td>
              <td className="p-1">
                <button
                  type="button"
                  className="m-1 px-1 border-1 hover:bg-gray-200"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default Payment;
