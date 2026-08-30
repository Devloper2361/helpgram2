import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "../i18n";
import { ShieldCheck, Star, Briefcase, Info, CheckCircle2 } from "lucide-react";

export default function WelfareDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [welfare, setWelfare] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [trustData, setTrustData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [profileRes, welfareRes, claimsRes, trustRes] = await Promise.all([
        fetch("/api/profile/me"),
        fetch("/api/welfare/profile"),
        fetch("/api/welfare/claims"),
        fetch(`/api/users/${user?.id}/trust`)
      ]);
      
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }
      if (welfareRes.ok) {
        const data = await welfareRes.json();
        setWelfare(data.profile);
      }
      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims);
      }
      if (trustRes.ok) {
        const data = await trustRes.json();
        if (!data.error) setTrustData(data);
      }
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to load welfare & trust data");
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
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to submit claim");
    }
  };

  if (loading) return <div className="text-center py-10">{t("ui.loading")}</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Trust & Welfare Center</h1>
        <p className="text-muted-foreground mt-2">Manage your verification, skills, reputation, and welfare benefits.</p>
      </div>
      
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-md">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="bg-blue-50/50 pb-4">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Trust & Reputation
              </CardTitle>
              {profile?.isVerified ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified Worker</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500">Unverified</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-slate-500 font-medium">Trust Score</span>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <span className="text-2xl font-bold">{Number(profile?.trustScore || 0).toFixed(1).replace(/\.0$/, '')}</span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-sm text-slate-500 font-medium">Completed Jobs</span>
                <div className="flex items-center gap-2 mt-1">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                  <span className="text-2xl font-bold">{trustData?.tasksCompleted || 0}</span>
                </div>
              </div>
            </div>
            
            {trustData && trustData.avgRating > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  You have a customer rating of <span className="font-semibold">{Number(trustData.avgRating).toFixed(1)}/5</span> across {trustData.reviewsCount || 0} reviews.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">My Skills & Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Skills</h4>
              {profile?.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s: any) => (
                    <Badge key={s.id} variant="secondary" className="flex items-center gap-1">
                      {s.name} <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No skills verified yet.</p>
              )}
            </div>
            
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Certifications</h4>
              {profile?.certifications && profile.certifications.length > 0 ? (
                <div className="space-y-2">
                  {profile.certifications.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center text-sm border p-2 rounded bg-slate-50">
                      <span className="font-medium">Certification #{c.id.substring(0,6)}</span>
                      <Badge variant={c.status === 'VERIFIED' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No certifications recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worker Welfare & Insurance</CardTitle>
          <CardDescription>Status of your cooperative benefits and protections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div className="border rounded-md p-4 bg-slate-50 flex flex-col justify-between">
                <span className="text-sm font-medium text-slate-500 mb-2">KYC Status</span>
                {profile?.isVerified ? (
                   <span className="font-semibold flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4"/> Verified</span>
                ) : (
                   <span className="font-semibold text-amber-600">Action Required</span>
                )}
             </div>
             
             <div className="border rounded-md p-4 bg-slate-50 flex flex-col justify-between">
                <span className="text-sm font-medium text-slate-500 mb-2">Insurance Integration</span>
                {welfare?.isCovered ? (
                   <div>
                     <span className="font-semibold flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4"/> Active</span>
                     <p className="text-sm font-medium mt-1">{welfare.providerName || 'HelpGram Cooperative Insurance'}</p>
                     <p className="text-xs text-slate-500 mt-1">{welfare.coverageType || 'Standard Welfare'}</p>
                     <p className="text-xs text-slate-500 mt-1">Coverage: ₹{welfare.coverageAmount || 0}</p>
                     <p className="text-xs text-slate-500 mt-1">Policy: {welfare.policyNumber || 'N/A'}</p>
                   </div>
                ) : (
                   <div>
                     <span className="font-semibold text-slate-600">Not Enrolled</span>
                     <p className="text-xs text-slate-500 mt-1">Pending cooperative/provider enrollment</p>
                   </div>
                )}
             </div>
             
             <div className="border rounded-md p-4 bg-slate-50 flex flex-col justify-between">
                <span className="text-sm font-medium text-slate-500 mb-2">Training</span>
                <span className="font-semibold text-slate-600">No training records yet</span>
             </div>
          </div>
          
          {welfare?.isCovered && (
             <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 space-y-1">
                   <p><span className="font-semibold">Coverage Amount:</span> ₹{Number(welfare.coverageAmount || 0).toLocaleString()}</p>
                   {welfare.validUntil && <p><span className="font-semibold">Valid Until:</span> {new Date(welfare.validUntil).toLocaleDateString()}</p>}
                   {welfare.policyNumber && <p><span className="font-semibold">Policy ID:</span> {welfare.policyNumber}</p>}
                </div>
             </div>
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
            <CardTitle>Welfare Claims & History</CardTitle>
            <CardDescription>{t("ui.status_of_your")}</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("ui.no_claims_submitted")}</p>
            ) : (
              <div className="space-y-4">
                {claims.map((claim: any) => (
                  <div key={claim.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{claim.title}</h3>
                      <Badge variant={claim.status === "APPROVED" || claim.status === "SETTLED" ? "default" : claim.status === "REJECTED" ? "destructive" : "secondary"}>
                        {claim.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{claim.description}</p>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm bg-slate-50 p-3 rounded-md">
                      <div>
                         <p className="text-slate-500 text-xs">Filed On</p>
                         <p className="font-medium">{new Date(claim.createdAt).toLocaleDateString()}</p>
                      </div>
                      {claim.incidentDate && (
                      <div>
                         <p className="text-slate-500 text-xs">Incident Date</p>
                         <p className="font-medium">{new Date(claim.incidentDate).toLocaleDateString()}</p>
                      </div>
                      )}
                      {(claim.status === "APPROVED" || claim.status === "SETTLEMENT_PROCESSING" || claim.status === "SETTLED") && welfare?.isCovered && (
                         <>
                         <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-slate-500 text-xs">Coverage Type</p>
                            <p className="font-medium text-blue-700">{welfare.coverageType || 'Standard Welfare'}</p>
                         </div>
                         <div>
                            <p className="text-slate-500 text-xs">Settlement Status</p>
                            <p className="font-medium">{claim.status === 'SETTLED' ? 'Settled' : claim.status === 'SETTLEMENT_PROCESSING' ? 'Processing' : 'Pending Processing'}</p>
                         </div>
                         </>
                      )}
                      {claim.status === "SETTLED" && (
                         <div>
                            <p className="text-slate-500 text-xs">Settlement Amount</p>
                            <p className="font-medium text-green-700">₹{claim.settlementAmount || '0'}</p>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center mt-8">
         <Button variant="outline" className="text-slate-600 border-slate-300">
            Contact Society for Support
         </Button>
      </div>
    </div>
  );
}
