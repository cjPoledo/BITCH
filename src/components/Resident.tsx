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

  // Initialize Residents
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
              setResidentsData((prev) => [
                ...prev,
                payload.new as ResidentData,
              ]);
              break;

            case "DELETE":
              setResidentsData((prev) =>
                prev.filter(
                  (resident) => resident.id !== (payload.old as ResidentData).id
                )
              );
              break;

            case "UPDATE":
              setResidentsData((prev) =>
                prev.map((resident) =>
                  resident.id === (payload.new as ResidentData).id
                    ? (payload.new as ResidentData)
                    : resident
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
      residentChannel.unsubscribe();
    };
  }, []);

  // Delete Resident
  const deleteResident = async (id: number) => {
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) {
      console.error("Error deleting resident:", error);
    }
  };

  // Add Resident
  const addResident = async () => {
    if (newResident.trim() === "") return;
    const { error } = await supabase
      .from("residents")
      .insert([{ nickname: newResident }])
      .select();
    if (error) {
      console.error("Error adding resident:", error);
    } else {
      setNewResident("");
    }
  };

  return (
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
  );
};

export default Resident;
