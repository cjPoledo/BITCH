import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import Resident from "./components/Resident";
import Expense from "./components/Expense";
import Summary from "./components/Summary";
import Payment from "./components/Payment";
import Login from "./components/Login";
import {
  type PaymentForData,
  type ContributorData,
  type ExpenseData,
  type PaymentData,
  type ResidentData,
} from "./types/types";

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [residentsData, setResidentsData] = useState<ResidentData[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseData[]>([]);
  const [contributorsData, setContributorsData] = useState<ContributorData[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [paymentForData, setPaymentForData] = useState<PaymentForData[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const navRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll that respects sticky navbar height
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navH = navRef.current?.offsetHeight ?? 80;
    const top = el.getBoundingClientRect().top + window.scrollY - (navH + 12);
    window.scrollTo({ top, behavior: "smooth" });
  };

  // Keep a CSS var --nav-h updated (used by .anchor-section)
  useEffect(() => {
    const setVar = () => {
      const h = navRef.current?.offsetHeight ?? 80;
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  // Auth state
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      setLoggedIn(event === "SIGNED_IN");
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
  };

  // Make #hash links also use our offset scrolling
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id) requestAnimationFrame(() => scrollToId(id));
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-500/15 via-indigo-500/15 to-slate-500/15 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      {!loggedIn ? (
        <Login supabase={supabase} />
      ) : (
        <>
          {/* Sticky branded navbar */}
          <div
            ref={navRef}
            className="sticky top-0 z-40 border-b border-slate-200/70 bg-nav-glass dark:border-slate-800/60 backdrop-blur"
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
              {/* Left: Logo + brand */}
              <a
                href="#summary"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("summary");
                }}
                className="group flex items-center gap-2 text-slate-800 dark:text-slate-100"
              >
                {/* Brand mark */}
                <svg
                  viewBox="0 0 64 64"
                  role="img"
                  aria-label="App logo"
                  className="h-9 w-9 drop-shadow-sm"
                >
                  <defs>
                    <linearGradient id="navLogoGradient" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#navLogoGradient)" />
                  <path
                    d="M24 22h12.5c4.5 0 7.5 2.7 7.5 6.6c0 3.2-1.9 5.6-4.9 6.5v.1c2.7.7 4.4 2.8 4.4 5.7c0 4.3-3.3 7.1-8.7 7.1H24V22zm7.8 10.8c2.6 0 4.2-1.2 4.2-3.3s-1.6-3.2-4.2-3.2H29v6.5h2.8zm.9 12.2c3 0 4.9-1.4 4.9-3.8c0-2.3-1.9-3.6-4.9-3.6H29v7.4h3.7z"
                    fill="#fff"
                    fillOpacity="0.95"
                  />
                </svg>
                <span className="text-lg font-semibold tracking-wide">B.I.T.C.H</span>
              </a>

              {/* Center: Nav pills */}
              <nav className="flex items-center gap-3">
                {[
                  ["summary", "Summary"],
                  ["resident", "Residents"],
                  ["expense", "Expenses"],
                  ["payment", "Payments"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => scrollToId(id)}
                    className="rounded-lg border border-white/60 bg-white/70 px-4 py-2.5 text-base font-medium text-slate-700/90 shadow-sm transition hover:bg-white/90 hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Right: Logout */}
              <button
                onClick={handleLogout}
                className="rounded-full bg-rose-500 px-4 py-2 text-base font-semibold text-white shadow-sm ring-1 ring-white/30 transition hover:bg-rose-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Main content surface */}
          <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
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
          </main>
        </>
      )}
    </div>
  );
}

export default App;