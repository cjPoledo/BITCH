import type { SupabaseClient } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
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
  const [showAddSuccess, setShowAddSuccess] = useState(false); // ✅ for add success

  // Initialize Residents
  useEffect(() => {
    const fetchResidents = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .order("nickname", { ascending: true });
      if (!error && data) setResidentsData(data);
    };
    fetchResidents();
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
            case "INSERT":
              setResidentsData((prev) => [...prev, payload.new as ResidentData]);
              break;
            case "DELETE":
              setResidentsData((prev) =>
                prev.filter((r) => r.id !== (payload.old as ResidentData).id)
              );
              break;
            case "UPDATE":
              setResidentsData((prev) =>
                prev.map((r) =>
                  r.id === (payload.new as ResidentData).id
                    ? (payload.new as ResidentData)
                    : r
                )
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      residentChannel.unsubscribe();
    };
  }, []);

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
    }
  };

  // Add Resident
  const addResident = async () => {
    if (newResident.trim() === "") return;
    const { error } = await supabase
      .from("residents")
      .insert([{ nickname: newResident.trim() }]);
    if (!error) {
      setNewResident("");
      setShowAddSuccess(true); // ✅ show success modal
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
          <h3 className="text-xl font-bold text-slate-800">Residents</h3>
          <p className="text-sm text-slate-500">Manage household members</p>
        </div>
      </div>

      {/* Add resident card */}
      <div className="mx-auto mb-5 max-w-3xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm">
        <label htmlFor="resident-nickname" className="mb-1 block text-sm font-medium text-slate-700">
          Add a resident
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="resident-nickname"
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none"
            placeholder="Enter nickname"
            value={newResident}
            onChange={(e) => setNewResident(e.target.value)}
            onKeyDown={onEnterAdd}
          />
          <button
            type="button"
            onClick={addResident}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </div>

      {/* Residents table */}
      <div className="mx-auto max-w-3xl overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 rounded-2xl border border-slate-200/70 bg-white/70 text-left shadow-sm">
          <thead>
            <tr className="bg-slate-50/70 text-slate-600">
              <th className="px-4 py-3 text-sm font-semibold">User</th>
              <th className="px-4 py-3 text-sm font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residentsData.map((resident) => (
              <tr key={resident.id}>
                <td className="px-4 py-3 text-slate-800">{resident.nickname}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => confirmDeleteResident(resident.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200/60 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {residentsData.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500">
                  No residents yet. Add one above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <p className="mb-4 text-slate-700">Are you sure you want to delete this resident?</p>
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
          <div className="rounded-xl bg-white p-6 shadow-lg text-center">
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
          <div className="rounded-xl bg-white p-6 shadow-lg text-center">
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