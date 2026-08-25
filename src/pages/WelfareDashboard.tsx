import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "../i18n";

export default function WelfareDashboard() {
    const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, claimsRes] = await Promise.all([
        fetch("/api/welfare/profile"),
        fetch("/api/welfare/claims")
      ]);
      
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }
      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load welfare data");
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/welfare/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          ...(incidentDate && { incidentDate: new Date(incidentDate).toISOString() })
        })
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setIncidentDate("");
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit claim");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to submit claim");
    }
  };

  if (loading) return <div className="text-center py-10">{t("ui.loading")}</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("ui.welfare_insurance")}</h1>
      </div>
      
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-md">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{t("ui.coverage_status")}</CardTitle>
          <CardDescription>{t("ui.your_current_welfare")}</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.isCovered ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-green-600">{t("ui.covered")}</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">{t("ui.active")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">{t("ui.coverage_type")}</p>
                  <p className="font-medium">{profile.coverageType || "Standard Welfare"}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t("ui.coverage_amount")}</p>
                  <p className="font-medium">${Number(profile.coverageAmount || 0).toFixed(2)}</p>
                </div>
                {profile.validUntil && (
                  <div>
                    <p className="text-slate-500">{t("ui.valid_until")}</p>
                    <p className="font-medium">{new Date(profile.validUntil).toLocaleDateString()}</p>
                  </div>
                )}
                {profile.policyNumber && (
                  <div>
                    <p className="text-slate-500">{t("ui.policy_number")}</p>
                    <p className="font-medium">{profile.policyNumber}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 py-4">
              {t("ui.you_are_currently")}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("ui.submit_welfare_claim")}</CardTitle>
            <CardDescription>{t("ui.file_a_claim")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("ui.title")}</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  minLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("ui.description")}</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  required 
                  minLength={10}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("ui.incident_date_optional")}</label>
                <Input 
                  type="date"
                  value={incidentDate} 
                  onChange={e => setIncidentDate(e.target.value)} 
                />
              </div>
              <Button type="submit" className="w-full">{t("ui.submit_claim")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("ui.your_claims")}</CardTitle>
            <CardDescription>{t("ui.status_of_your")}</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("ui.no_claims_submitted")}</p>
            ) : (
              <div className="space-y-4">
                {claims.map((claim: any) => (
                  <div key={claim.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{claim.title}</h3>
                      <Badge variant={claim.status === "APPROVED" ? "default" : claim.status === "REJECTED" ? "destructive" : "secondary"}>
                        {claim.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">{claim.description}</p>
                    <p className="text-xs text-slate-400">
                      {t("ui.filed_on")}{new Date(claim.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
