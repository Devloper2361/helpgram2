import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useTranslation } from "../i18n";

export default function AdminCertifications() {
    const { t } = useTranslation();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCerts = async () => {
    const res = await fetch("/api/certifications");
    if (res.ok) {
      const data = await res.json();
      setCerts(data.certifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    const res = await fetch(`/api/certifications/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchCerts();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update certification");
    }
  };

  if (loading) return <div>{t("ui.loading")}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold">{t("ui.certification_review")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("ui.pending_certifications")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certs.map(c => (
              <div key={c.id} className="border p-4 rounded-md flex justify-between items-center bg-white">
                <div>
                  <p className="font-semibold">{c.profile.user.email}</p>
                  <p className="text-sm">{t("ui.skill")}<Badge>{c.skill.name}</Badge></p>
                  {c.evidence && <p className="text-sm mt-1">{t("ui.evidence")}<a href={c.evidence} target="_blank" rel="noreferrer" className="text-blue-500 underline">{c.evidence}</a></p>}
                  <p className="text-xs text-muted-foreground mt-1">{t("ui.status")}{c.status}</p>
                </div>
                <div className="flex gap-2">
                  {c.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => handleStatusUpdate(c.id, "VERIFIED")} className="bg-green-600 hover:bg-green-700">{t("ui.approve")}</Button>
                      <Button size="sm" onClick={() => handleStatusUpdate(c.id, "REJECTED")} variant="destructive">{t("ui.reject")}</Button>
                    </>
                  )}
                  {c.status !== "PENDING" && <Badge variant="outline">{c.status}</Badge>}
                </div>
              </div>
            ))}
            {certs.length === 0 && <p className="text-muted-foreground">{t("ui.no_certifications_to")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
