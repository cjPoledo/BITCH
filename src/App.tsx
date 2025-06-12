import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import Resident from "./components/Resident";
import {
  type PaymentForData,
  type ContributorData,
  type ExpenseData,
  type PaymentData,
  type ResidentData,
} from "./types/types";
import Expense from "./components/Expense";
import Summary from "./components/Summary";
import Login from "./components/Login";
import Payment from "./components/Payment";

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
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [paymentForData, setPaymentForData] = useState<PaymentForData[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  // listen for auth state changes
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
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
            paymentsData={paymentsData}
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

          <Payment
            supabase={supabase}
            paymentsData={paymentsData}
            setPaymentsData={setPaymentsData}
            paymentForData={paymentForData}
            setPaymentForData={setPaymentForData}
            residentsData={residentsData}
            expensesData={expensesData}
            contributorsData={contributorsData}
          />

          <nav className="sticky bottom-0 bg-white p-2 border-b flex justify-center">
            <a href="#summary" className="m-2 px-1 border-1 hover:bg-gray-200">
              Summary
            </a>
            <a href="#resident" className="m-2 px-1 border-1 hover:bg-gray-200">
              Residents
            </a>
            <a href="#expense" className="m-2 px-1 border-1 hover:bg-gray-200">
              Expenses
            </a>
            <a href="#payment" className="m-2 px-1 border-1 hover:bg-gray-200">
              Payments
            </a>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
