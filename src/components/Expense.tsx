import React, { useEffect, useRef, useState } from "react";
import type {
  ContributorData,
  ExpenseData,
  ResidentData,
} from "../types/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import Select, { type SelectInstance } from "react-select";

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
        .order("id", { ascending: true });
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
              setExpensesData((prev) => [...prev, payload.new as ExpenseData]);
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
    <section className="p-2">
      <h3 className="text-center font-bold text-xl">Expenses</h3>
      <table className="mx-auto my-2 text-center">
        <thead>
          <tr>
            <th className="p-1">Date Added</th>
            <th className="p-1">Item</th>
            <th className="p-1">Price</th>
            <th className="p-1">Care Of</th>
            <th className="p-1">Contributors</th>
            <th className="p-1">Notes</th>
            <th className="p-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {expensesData.map((expense) => (
            <tr key={expense.id}>
              <td className="p-1">
                {new Date(expense.created_at).toLocaleString()}
              </td>
              <td className="p-1">{expense.item}</td>
              <td className="p-1">₱{expense.price}</td>
              <td className="p-1">
                {
                  residentsData.find(
                    (resident) => resident.id === expense.care_of
                  )?.nickname
                }
              </td>
              <td className="p-1">
                {contributorsData
                  .filter(
                    (contributor) => contributor.expense_id === expense.id
                  )
                  .map((contributor, index, array) => (
                    <span key={contributor.resident_id}>
                      {
                        residentsData.find(
                          (resident) => resident.id === contributor.resident_id
                        )?.nickname
                      }
                      {index < array.length - 1 && ", "}
                    </span>
                  ))}
              </td>
              <td className="p-1">{expense.notes}</td>
              <td className="p-1">
                <button
                  type="button"
                  className="m-1 px-1 border-1 hover:bg-gray-200"
                  onClick={() => deleteExpense(expense.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td className="p-1">-</td>
            <td className="p-1">
              <input
                type="text"
                className="border"
                placeholder="Enter item"
                value={newExpenseItem}
                onChange={(e) => setNewExpenseItem(e.target.value)}
              />
            </td>
            <td className="p-1">
              <input
                type="number"
                className="border"
                placeholder="Enter price"
                value={newExpensePrice}
                onChange={(e) => setNewExpensePrice(Number(e.target.value))}
              />
            </td>
            <td className="p-1">
              <Select
                ref={newExpenseCareOfRef}
                options={residentsData}
                getOptionLabel={(resident) => {
                  return resident.nickname;
                }}
                getOptionValue={(resident) => {
                  return resident.id.toString();
                }}
              />
            </td>
            <td className="p-1">
              <Select
                ref={newExpenseContributorsRef}
                options={residentsData}
                getOptionLabel={(resident) => {
                  return resident.nickname;
                }}
                getOptionValue={(resident) => {
                  return resident.id.toString();
                }}
                isMulti
              />
            </td>
            <td className="p-1">
              <input
                type="text"
                className="border"
                placeholder="Enter notes"
                value={newExpenseNotes}
                onChange={(e) => setNewExpenseNotes(e.target.value)}
              />
            </td>
            <td>
              <button
                type="button"
                className="m-1 px-1 border-1 hover:bg-gray-200"
                onClick={addExpense}
              >
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};

export default Expense;
