import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import Resident from "./components/Resident";
import type { ContributorData, ExpenseData, ResidentData } from "./types/types";
import Expense from "./components/Expense";
import Summary from "./components/Summary";
import Login from "./components/Login";

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [residentsData, setResidentsData] = useState<ResidentData[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseData[]>([]);
  const [contributorsData, setContributorsData] = useState<ContributorData[]>(
    []
  );
  const [loggedIn, setLoggedIn] = useState(false);

  // listen for auth state changes
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setLoggedIn(true);
      } else if (event === "SIGNED_OUT") {
        setLoggedIn(false);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
    }
  };

  return (
    <div className="p-2">
      <h1 className="text-center font-bold text-5xl">B.I.T.C.H.</h1>
      <h2 className="text-center text-xl">
        Budgeting Interface for Tracking Charges at Home
      </h2>

      {!loggedIn ? (
        <Login supabase={supabase} />
      ) : (
        <>
          <button
            onClick={handleLogout}
            className="m-5 px-1 border-1 hover:bg-gray-200 mx-auto block"
          >
            Logout
          </button>

          <Summary
            residentsData={residentsData}
            expensesData={expensesData}
            contributorsData={contributorsData}
          />

          <Resident
            supabase={supabase}
            residentsData={residentsData}
            setResidentsData={setResidentsData}
          />

          <Expense
            supabase={supabase}
            expensesData={expensesData}
            setExpensesData={setExpensesData}
            contributorsData={contributorsData}
            setContributorsData={setContributorsData}
            residentsData={residentsData}
          />
        </>
      )}

      {/* <section className="p-2">
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
      </section> */}
    </div>
  );
}

export default App;
