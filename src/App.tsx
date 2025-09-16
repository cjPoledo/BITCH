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
  const [activeSection, setActiveSection] = useState("summary"); // track active

  const navRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll that respects sticky navbar height
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navH = navRef.current?.offsetHeight ?? 80;
    const top = el.getBoundingClientRect().top + window.scrollY - (navH + 12);
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSection(id);
  };

  // Watch scroll position to update active section
  useEffect(() => {
    const sections = ["summary", "resident", "expense", "payment"];
    const onScroll = () => {
      const navH = navRef.current?.offsetHeight ?? 80;
      let current = activeSection;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const offsetTop = el.offsetTop - navH - 20;
          if (window.scrollY >= offsetTop) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
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

  // Force a consistent LIGHT theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute("content", "light");
    } else {
      const m = document.createElement("meta");
      m.setAttribute("name", "color-scheme");
      m.setAttribute("content", "light");
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.12),transparent_45%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.12),transparent_50%)]">
      {!loggedIn ? (
        <Login supabase={supabase} />
      ) : (
        <>
          {/* Sticky branded navbar */}
          <div
            ref={navRef}
            className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
              {/* Left: Logo + brand */}
              <a
                href="#summary"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId("summary");
                }}
                className="group flex items-center gap-2 text-slate-900"
                aria-label="B.I.T.C.H home"
              >
                {/* Brand mark — unified gradient + monogram */}
                <svg
                  viewBox="0 0 64 64"
                  role="img"
                  aria-hidden="true"
                  className="h-8 w-8 sm:h-9 sm:w-9 drop-shadow-sm"
                >
                  <defs>
                    {/* Use a stable id so it never clashes with other icons */}
                    <linearGradient id="brandGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  {/* Soft square */}
                  <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#brandGrad)" />
                  {/* Monogram B built from paths for crisp rendering on all DPIs */}
                  <path
                    d="M24 20h14c6 0 10 3.5 10 8.6c0 3.7-2.2 6.4-5.7 7.6c2.9 1 4.7 3.3 4.7 6.6c0 5.2-4 8.2-10.6 8.2H24V20Zm8.5 13.1c3.1 0 5.1-1.5 5.1-4s-2-3.9-5.1-3.9H29v7.9h3.5Zm1.5 13.8c3.7 0 6.1-1.8 6.1-4.6c0-2.8-2.4-4.4-6.1-4.4H29v9h5Z"
                    fill="#fff"
                    fillOpacity="0.96"
                  />
                </svg>

                {/* Wordmark — locked size/weight to match brand */}
                <span className="select-none font-semibold tracking-wide text-[17px] sm:text-[18px] leading-none">
                  B.I.T.C.H
                </span>
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
                    className={`rounded-lg px-4 py-2.5 text-base font-medium shadow-sm transition ${
                      activeSection === id
                        ? "bg-indigo-500 text-white"
                        : "bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Right: Logout */}
              <button
                onClick={handleLogout}
                className="rounded-full bg-rose-500 px-4 py-2 text-base font-semibold text-white shadow-sm ring-1 ring-rose-400/40 transition hover:bg-rose-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Main content */}
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