import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import Select from "react-select";

// Types
type Resident = {
  id: number;
  nickname: string;
  created_at: string;
};

type Expense = {
  id: number;
  created_at: string;
  item: string;
  price: number;
  care_of: number;
  notes: string;
};

type Contributor = {
  expense_id: number;
  resident_id: number;
};

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  // Initialize Residents
  const [residentsData, setResidentsData] = useState([] as Resident[]);
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .order("id", { ascending: true });
      if (error) {
        console.error("Error fetching residents:", error);
      } else {
        setResidentsData(data);
      }
    };
    fetchResidents();
  }, []);

  // Delete Resident
  const deleteResident = async (id: number) => {
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) {
      console.error("Error deleting resident:", error);
    } else {
      setResidentsData((prev) => prev.filter((resident) => resident.id !== id));
    }
  };

  // Add Resident
  const [newResident, setNewResident] = useState("");
  const addResident = async () => {
    if (newResident.trim() === "") return;
    const { data, error } = await supabase
      .from("residents")
      .insert([{ nickname: newResident }])
      .select();
    if (error) {
      console.error("Error adding resident:", error);
    } else {
      setResidentsData((prev) => [...prev, ...data]);
      setNewResident("");
    }
  };

  // Initialize Expenses
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [contributorsData, setContributorsData] = useState<Contributor[]>([]);
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

  // Delete Expense
  const deleteExpense = async (id: number) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      console.error("Error deleting expense:", error);
    } else {
      setExpensesData((prev) => prev.filter((expense) => expense.id !== id));
      setContributorsData((prev) =>
        prev.filter((contributor) => contributor.expense_id !== id)
      );
    }
  };

  // Add Expense
  const [newExpenseItem, setNewExpenseItem] = useState("");
  const [newExpensePrice, setNewExpensePrice] = useState(0);
  const [newExpenseCareOf, setNewExpenseCareOf] = useState<Resident | null>(
    null
  );
  const [newExpenseContributors, setNewExpenseContributors] = useState<
    Resident[]
  >([]);
  const [newExpenseNotes, setNewExpenseNotes] = useState("");
  const addExpense = async () => {
    if (
      newExpenseItem.trim() === "" ||
      newExpensePrice <= 0 ||
      !newExpenseCareOf ||
      newExpenseContributors.length === 0
    )
      return;

    const newExpense = {
      item: newExpenseItem,
      price: newExpensePrice,
      care_of: newExpenseCareOf.id,
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
      newExpenseContributors.forEach(async (contributor) => {
        const { data, error } = await supabase
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
        } else {
          setContributorsData((prev) => [...prev, ...data]);
        }
      });
      setExpensesData((prev) => [...prev, ...data]);
      setNewExpenseItem("");
      setNewExpensePrice(0);
      setNewExpenseCareOf(null);
      setNewExpenseContributors([]);
      setNewExpenseNotes("");
    }
  };

  return (
    <div className="p-2">
      {/* <h1 className="text-center font-bold text-5xl">B.I.T.C.H.</h1> */}
      <h2 className="text-center text-xl">
        Budgeting Interface for Tracking Charges at Home
      </h2>

      <section className="p-2">
        {/* Residents Section */}
        <h3 className="text-center font-bold text-xl">Residents</h3>
        <table className="mx-auto my-2 text-center">
          <thead>
            <tr>
              <th className="p-1">Users</th>
              <th className="p-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residentsData.map((resident) => (
              <tr key={resident.id}>
                <td className="p-1">{resident.nickname}</td>
                <td className="p-1">
                  <button
                    type="button"
                    className="m-1 px-1 border-1 hover:bg-gray-200"
                    onClick={() => deleteResident(resident.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className="p-1">
                <input
                  type="text"
                  className="border"
                  placeholder="Enter nickname"
                  value={newResident}
                  onChange={(e) => setNewResident(e.target.value)}
                />
              </td>
              <td className="p-1">
                <button
                  type="button"
                  className="m-1 px-1 border-1 hover:bg-gray-200"
                  onClick={addResident}
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="p-2">
        {/* Expenses Section */}
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
                            (resident) =>
                              resident.id === contributor.resident_id
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
                  options={residentsData}
                  getOptionLabel={(resident) => {
                    return resident.nickname;
                  }}
                  getOptionValue={(resident) => {
                    return resident.id.toString();
                  }}
                  onChange={(newValue) => {
                    setNewExpenseCareOf(newValue);
                  }}
                />
              </td>
              <td className="p-1">
                <Select
                  options={residentsData}
                  getOptionLabel={(resident) => {
                    return resident.nickname;
                  }}
                  getOptionValue={(resident) => {
                    return resident.id.toString();
                  }}
                  onChange={(newValue) => {
                    setNewExpenseContributors(newValue as Resident[]);
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

      <section className="p-2">
        {/* Payments Section */}
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
              <td className="p-1">2023-10-01</td>
              <td className="p-1">John Doe</td>
              <td className="p-1">Jane Smith</td>
              <td className="p-1">$50</td>
              <td className="p-1">Rent, Groceries</td>
              <td className="p-1">Monthly rent</td>
              <td className="p-1">
                <button
                  type="button"
                  className="m-1 px-1 border-1 hover:bg-gray-200"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr>
              <td className="p-1">-</td>
              <td className="p-1">
                <select
                  name="contributors"
                  id="contributors"
                  className="border"
                >
                  <option value="John Doe">John Doe</option>
                  <option value="Jane Smith">Jane Smith</option>
                  <option value="Bob Johnson">Bob Johnson</option>
                </select>
              </td>
              <td className="p-1">
                <select
                  name="contributors"
                  id="contributors"
                  className="border"
                >
                  <option value="John Doe">John Doe</option>
                  <option value="Jane Smith">Jane Smith</option>
                  <option value="Bob Johnson">Bob Johnson</option>
                </select>
              </td>
              <td className="p-1">
                <input
                  type="text"
                  name="newprice"
                  id="newprice"
                  className="border"
                  placeholder="Enter price"
                />
              </td>
              <td className="p-1">
                <select name="careof" id="careof" className="border" multiple>
                  <option value="Rent">Rent</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Utilities">Utilities</option>
                </select>
              </td>
              <td className="p-1">
                <input
                  type="text"
                  name="newnotes"
                  id="newnotes"
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
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
