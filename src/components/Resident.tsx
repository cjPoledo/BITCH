import type { SupabaseClient } from "@supabase/supabase-js";
import React, { useEffect, useMemo, useState } from "react";
import type { ResidentData } from "../types/types";

const Resident = ({
  supabase,
  residentsData,
  setResidentsData,
}: {
  supabase: SupabaseClient;
  residentsData: ResidentData[];
  setResidentsData: React.Dispatch<React.SetStateAction<ResidentData[]>>;
}) => {
  const [newResident, setNewResident] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // Alphabetically sorted list (stable across realtime events)
  const sortedResidents = useMemo(
    () =>
      [...residentsData].sort((a, b) =>
        a.nickname.localeCompare(b.nickname, undefined, { sensitivity: "base" })
      ),
    [residentsData]
  );

  // Initialize Residents
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .order("nickname", { ascending: true });
      if (!error && data) setResidentsData(data);
      if (error) console.error("[Residents] fetch error:", error.message);
    };
    fetchResidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to changes in the residents table
  useEffect(() => {
    const residentChannel = supabase.channel("residents-channel");

    residentChannel
      .on(
        "postgres_changes",
        { schema: "public", event: "*", table: "residents" },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT": {
              setResidentsData((prev) => {
                const next = [...prev, payload.new as ResidentData];
                next.sort((a, b) =>
                  a.nickname.localeCompare(b.nickname, undefined, { sensitivity: "base" })
                );
                return next;
              });
              break;
            }
            case "DELETE": {
              setResidentsData((prev) =>
                prev.filter((r) => r.id !== (payload.old as ResidentData).id)
              );
              break;
            }
            case "UPDATE": {
              setResidentsData((prev) =>
                prev
                  .map((r) =>
                    r.id === (payload.new as ResidentData).id
                      ? (payload.new as ResidentData)
                      : r
                  )
                  .sort((a, b) =>
                    a.nickname.localeCompare(b.nickname, undefined, { sensitivity: "base" })
                  )
              );
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      residentChannel.unsubscribe();
    };
  }, [setResidentsData, supabase]);

  // Open modal
  const confirmDeleteResident = (id: number) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  // Actually delete
  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("residents").delete().eq("id", deleteId);
    if (!error) {
      setShowConfirm(false);
      setShowSuccess(true);
    } else {
      console.error("[Residents] delete error:", error.message);
      setShowConfirm(false);
    }
  };

  // Add Resident
  const addResident = async () => {
    const trimmed = newResident.trim();
    if (trimmed === "") return;

    // Client-side duplicate guard (case-insensitive)
    const dup = residentsData.some(
      (r) => r.nickname.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (dup) {
      setAddError("That nickname already exists.");
      return;
    }

    setAdding(true);
    setAddError("");
    const { error } = await supabase.from("residents").insert([{ nickname: trimmed }]);
    setAdding(false);
    if (!error) {
      setNewResident("");
      setShowAddSuccess(true);
    } else {
      console.error("[Residents] add error:", error.message);
      setAddError("Could not add resident. Please try again.");
    }
  };

  const onEnterAdd: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addResident();
    }
  };

  return (
    <section id="resident" className="px-3 py-4 scroll-mt-28">
      {/* Header */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-center gap-3">
        <div className="h-9 w-9">
          <svg viewBox="0 0 64 64" role="img" aria-label="Residents" className="h-9 w-9">
            <defs>
              <linearGradient id="resGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#resGrad)" />
            <path
              d="M22 31a6 6 0 1 0 0-12a6 6 0 0 0 0 12Zm20 0a6 6 0 1 0 0-12a6 6 0 0 0 0 12ZM11 46c0-6 7-11 15-11s15 5 15 11v2H11v-2Zm27 0c1-3.5 4.5-6 8-6s7 2.5 8 6v2H38v-2Z"
              fill="#fff"
              fillOpacity="0.95"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Residents</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage household members</p>
        </div>
      </div>

      {/* Add resident card */}
      <div className="mx-auto mb-5 max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="resident-nickname" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Add a resident
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="resident-nickname"
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Enter nickname"
            value={newResident}
            onChange={(e) => setNewResident(e.target.value)}
            onKeyDown={onEnterAdd}
            aria-invalid={!!addError}
            aria-describedby={addError ? "resident-error" : undefined}
          />
          <button
            type="button"
            onClick={addResident}
            disabled={adding || newResident.trim() === ""}
            className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
              adding || newResident.trim() === ""
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600"
            }`}
            aria-busy={adding}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && (
          <p id="resident-error" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {addError}
          </p>
        )}
      </div>

      {/* Residents table — desktop */}
      <div className="mx-auto hidden max-w-3xl overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-0 rounded-2xl border border-slate-200 bg-white text-left shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <thead>
            <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <th className="px-4 py-3 text-sm font-semibold">User</th>
              <th className="px-4 py-3 text-sm font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResidents.map((resident) => (
              <tr
                key={resident.id}
                className="transition-colors odd:bg-white even:bg-slate-50 hover:bg-indigo-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800 dark:hover:bg-slate-800"
              >
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{resident.nickname}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => confirmDeleteResident(resident.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sortedResidents.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                  No residents yet. Add one above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Residents cards — mobile */}
      <div className="mx-auto max-w-3xl space-y-3 md:hidden">
        {sortedResidents.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No residents yet. Add one above to get started.
          </div>
        )}

        {sortedResidents.map((resident) => (
          <div
            key={resident.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {resident.nickname}
                </div>
              </div>
              <button
                type="button"
                onClick={() => confirmDeleteResident(resident.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-rose-200/60 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <p className="mb-4 text-slate-700 dark:text-slate-200">
              Are you sure you want to delete this resident?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm text-white"
                onClick={handleDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (Delete) */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-lg text-center dark:bg-slate-900">
            <p className="mb-4 text-emerald-600">Resident deleted successfully!</p>
            <button
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm text-white"
              onClick={() => setShowSuccess(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Modal (Add) */}
      {showAddSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-lg text-center dark:bg-slate-900">
            <p className="mb-4 text-emerald-600">Resident added successfully!</p>
            <button
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm text-white"
              onClick={() => setShowAddSuccess(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Resident;