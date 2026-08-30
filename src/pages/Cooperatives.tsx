import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../i18n";

export default function CooperativesPage() {
    const { t } = useTranslation();
  const { user } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSocieties();
  }, []);

  const fetchSocieties = async () => {
    try {
      if (user) {
        const memRes = await fetch("/api/memberships/me");
        if (memRes.ok) {
          const memData = await memRes.json();
          setMemberships(memData.societyMemberships || []);
        }
      }
    } catch (e) {}
    try {
      setLoading(true);
      const res = await fetch("/api/societies");
      if (!res.ok) throw new Error("Failed to fetch societies");
      const data = await res.json();
      setSocieties(data.societies || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (societyId: string) => {
    try {
      const res = await fetch(`/api/societies/${societyId}/apply`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      alert("Application submitted successfully");
      fetchSocieties(); // Re-fetch to update any client state if we add membership status to the societies response
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>{t("ui.loading")}</div>;
  if (error) return <div className="text-red-500">{typeof error === 'string' ? error : JSON.stringify(error)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ui.cooperative_directory")}</h1>
        <p className="text-slate-500">{t("ui.discover_and_join")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {societies.map((soc) => (
          <div key={soc.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-semibold text-lg text-slate-900 truncate">{soc.name}</h3>
            {soc.federation && (
              <p className="text-xs text-blue-600 font-medium mb-2">{soc.federation.name}</p>
            )}
            <p className="text-sm text-slate-600 mb-4 flex-1 line-clamp-3">{soc.description || "No description provided."}</p>
            <div className="flex justify-between items-center text-sm mb-4">
              <span className="text-slate-500">{soc.location || "Online"}</span>
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                {soc.status}
              </span>
            </div>
            {user?.role === "WORKER" && (() => {
              const membership = memberships.find(m => m.societyId === soc.id);
              if (!membership) {
                return (
                  <Button onClick={() => handleApply(soc.id)} className="w-full">
                    {t("ui.apply_to_join")}
                  </Button>
                );
              }
              if (membership.status === "PENDING") {
                return (
                  <Button disabled variant="secondary" className="w-full">
                    Pending
                  </Button>
                );
              }
              if (membership.status === "ACTIVE") {
                return (
                  <Button disabled variant="outline" className="w-full border-green-500 text-green-700 bg-green-50">
                    Joined
                  </Button>
                );
              }
              if (membership.status === "REJECTED") {
                return (
                  <Button disabled variant="destructive" className="w-full">
                    Rejected
                  </Button>
                );
              }
              if (membership.status === "SUSPENDED") {
                return (
                  <Button disabled variant="destructive" className="w-full">
                    Suspended
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        ))}
        {societies.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            {t("ui.no_cooperatives_found")}</div>
        )}
      </div>
    </div>
  );
}
