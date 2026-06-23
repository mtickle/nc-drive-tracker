import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PrintableLog({ session }) {
  const [profile, setProfile] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!session?.user?.id) return;

      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const drivesPromise = supabase
        .from("drives")
        .select("*")
        .eq("user_id", session.user.id)
        .order("start_time", { ascending: true }); // DMV usually wants chronological order

      const [profileRes, drivesRes] = await Promise.all([
        profilePromise,
        drivesPromise,
      ]);

      if (!profileRes.error && profileRes.data) setProfile(profileRes.data);
      if (!drivesRes.error && drivesRes.data) setDrives(drivesRes.data);

      setLoading(false);

      // Automatically open the print dialog after a brief delay to ensure rendering
      setTimeout(() => {
        window.print();
      }, 500);
    }

    fetchData();
  }, [session]);

  const totalMinutes = drives.reduce(
    (sum, drive) => sum + drive.duration_minutes,
    0
  );
  const nightMinutes = drives
    .filter((d) => d.is_night)
    .reduce((sum, drive) => sum + drive.duration_minutes, 0);

  const totalHours = (totalMinutes / 60).toFixed(1);
  const nightHours = (nightMinutes / 60).toFixed(1);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 print:hidden">
        Preparing official log...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 text-black">
      {/* Screen-only back button */}
      <div className="mb-8 print:hidden">
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {/* Official Document Header */}
      <div className="mb-8 border-b-2 border-black pb-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-widest">
          North Carolina Driving Log
        </h1>
        <p className="mt-1 text-sm">Supervised Driving Verification</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="mb-2">
            <span className="font-bold">Student Name:</span>{" "}
            {profile?.full_name || session?.user?.email}
          </p>
          <p className="mb-2">
            <span className="font-bold">Permit Number:</span>{" "}
            ___________________
          </p>
        </div>
        <div className="text-right">
          <p className="mb-2">
            <span className="font-bold">Total Hours Logged:</span> {totalHours}{" "}
            / 60.0
          </p>
          <p className="mb-2">
            <span className="font-bold">Night Hours Logged:</span> {nightHours}{" "}
            / 10.0
          </p>
        </div>
      </div>

      {/* The Driving Table */}
      <table className="mb-12 w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-black bg-slate-50">
            <th className="py-2 pl-2 font-bold uppercase">Date</th>
            <th className="py-2 font-bold uppercase">Supervisor</th>
            <th className="py-2 font-bold uppercase">Conditions</th>
            <th className="py-2 pr-2 text-right font-bold uppercase">
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {drives.length === 0 ? (
            <tr>
              <td
                colSpan="4"
                className="py-4 text-center italic text-slate-500"
              >
                No driving sessions logged.
              </td>
            </tr>
          ) : (
            drives.map((drive) => (
              <tr key={drive.id} className="border-b border-slate-300">
                <td className="py-2 pl-2">
                  {new Date(drive.start_time).toLocaleDateString()}
                </td>
                <td className="py-2">{drive.supervisor_name}</td>
                <td className="py-2">{drive.is_night ? "Night" : "Day"}</td>
                <td className="py-2 pr-2 text-right">
                  {drive.duration_minutes} min
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Official Signatures */}
      <div className="mt-16 grid grid-cols-2 gap-12">
        <div>
          <div className="border-b border-black pt-8"></div>
          <p className="mt-2 text-xs font-bold uppercase">Student Signature</p>
        </div>
        <div>
          <div className="border-b border-black pt-8"></div>
          <p className="mt-2 text-xs font-bold uppercase">
            Primary Supervisor Signature
          </p>
        </div>
      </div>
    </div>
  );
}
