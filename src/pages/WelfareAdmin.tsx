import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WelfareAdmin() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  const [isCovered, setIsCovered] = useState(false);
  const [coverageType, setCoverageType] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [providerName, setProviderName] = useState("HelpGram Cooperative Insurance");
  const [premium, setPremium] = useState("");
  const [settlementAmounts, setSettlementAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workersRes, claimsRes, statsRes] = await Promise.all([
        fetch("/api/welfare/workers"),
        fetch("/api/welfare/claims"),
        fetch("/api/welfare/stats")
      ]);
      
      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers);
      }
      
      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!stats) return;
    setLoadingInsights(true);
    setError("");
    try {
      const res = await fetch("/api/welfare/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats })
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      } else {
        const data = await res.json();
        if (data.error && data.error.includes("exceeded your current quota")) {
           setError("AI Advisor is currently unavailable (Gemini Quota Exceeded).");
        } else {
           setError(data.error || "Failed to generate insights");
        }
      }
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to generate insights (Gemini API error or offline).");
    } finally {
      setLoadingInsights(false);
    }
  };

  const updateClaimStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/welfare/claims/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update claim");
      }
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to update claim");
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    
    try {
      const res = await fetch(`/api/welfare/profile/${selectedWorker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCovered,
          ...(coverageType && { coverageType }),
          ...(coverageAmount && { coverageAmount: Number(coverageAmount) }),
          ...(validUntil && { validUntil: new Date(validUntil).toISOString() }),
          ...(policyNumber && { policyNumber }),
          ...(providerName && { providerName }),
          ...(premium && { premium: Number(premium) })
        })
      });

      if (res.ok) {
        setSelectedWorker(null);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch (e: any) {
      console.error(e?.message || e);
      setError("Failed to update profile");
    }
  };

  const openProfileDialog = (worker: any) => {
    setSelectedWorker(worker);
    setIsCovered(worker.welfareProfile?.isCovered || false);
    setCoverageType(worker.welfareProfile?.coverageType || "");
    setCoverageAmount(worker.welfareProfile?.coverageAmount || "");
    setValidUntil(worker.welfareProfile?.validUntil ? new Date(worker.welfareProfile.validUntil).toISOString().split('T')[0] : "");
    setPolicyNumber(worker.welfareProfile?.policyNumber || "");
    setProviderName(worker.welfareProfile?.providerName || "HelpGram Cooperative Insurance");
    setPremium(worker.welfareProfile?.premium?.toString() || "250");
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Welfare Management</h1>
      </div>
      
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-md">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalWorkers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.verifiedWorkers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">With Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.workersWithSkills}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.coveredWorkers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{stats.claimsPending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>AI Welfare Advisor</CardTitle>
                <CardDescription>Generate insights based on aggregate workforce data</CardDescription>
              </div>
              <Button onClick={generateInsights} disabled={loadingInsights}>
                {loadingInsights ? "Analyzing..." : "Generate Welfare Insights"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-md border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{insight.title}</h4>
                      <Badge variant={insight.priority === 'HIGH' ? 'destructive' : insight.priority === 'MEDIUM' ? 'default' : 'secondary'}>
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Observation: {insight.observation}</p>
                    <p className="text-sm font-semibold text-blue-700 mb-1">Recommendation: {insight.recommendation}</p>
                    <p className="text-xs text-slate-500 italic">Reason: {insight.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Click the button above to generate insights.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Worker Coverage</CardTitle>
            <CardDescription>Manage insurance and welfare coverage for workers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {workers.map((worker: any) => (
                <div key={worker.id} className="border rounded-md p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{worker.profile?.fullName || worker.email}</h3>
                    <p className="text-sm text-slate-500">{worker.email}</p>
                    <div className="mt-2">
                      {worker.welfareProfile?.isCovered ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Covered</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Not Covered</Badge>
                      )}
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger className="py-1.5 px-3 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center" onClick={() => openProfileDialog(worker)}>
                      Edit Coverage
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Coverage: {selectedWorker?.profile?.fullName || selectedWorker?.email}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={updateProfile} className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="isCovered"
                            checked={isCovered}
                            onChange={(e) => setIsCovered(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="isCovered" className="font-medium">Is Covered</label>
                        </div>
                        
                        {isCovered && (
                          <>
                                                        <div>
                              <label className="block text-sm font-medium mb-1">Provider Name</label>
                              <Input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="HelpGram Cooperative Insurance" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Coverage Type</label>
                              <Input value={coverageType} onChange={e => setCoverageType(e.target.value)} placeholder="Accident & Occupational Coverage" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Coverage Amount ($)</label>
                              <Input type="number" value={coverageAmount} onChange={e => setCoverageAmount(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Valid Until</label>
                              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Policy Number (Optional)</label>
                              <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
                            </div>
                          </>
                        )}
                        <Button type="submit" className="w-full">Save Changes</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
              {workers.length === 0 && <p className="text-slate-500 text-sm">No workers found in your jurisdiction.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Welfare Claims</CardTitle>
            <CardDescription>Review and manage worker claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {claims.length === 0 ? (
                <p className="text-slate-500 text-sm">No claims submitted.</p>
              ) : (
                claims.map((claim: any) => (
                  <div key={claim.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{claim.title}</h3>
                        <p className="text-sm font-medium text-slate-700">Worker: {claim.worker?.profile?.fullName || claim.worker?.email}</p>
                      </div>
                      <Badge variant={claim.status === "APPROVED" ? "default" : claim.status === "REJECTED" ? "destructive" : "secondary"}>
                        {claim.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">{claim.description}</p>
                    <div className="text-xs text-slate-500 mb-4">
                      <p>Filed: {new Date(claim.createdAt).toLocaleDateString()}</p>
                      {claim.incidentDate && <p>Incident Date: {new Date(claim.incidentDate).toLocaleDateString()}</p>}
                    </div>

                    {claim.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateClaimStatus(claim.id, "APPROVED")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateClaimStatus(claim.id, "REJECTED")}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {claim.status === "APPROVED" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "SETTLEMENT_PROCESSING")}>
                          Process Settlement
                        </Button>
                      </div>
                    )}
                    {claim.status === "SETTLEMENT_PROCESSING" && (
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">₹</span>
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="w-24 h-9"
                          value={settlementAmounts[claim.id] || ""}
                          onChange={(e) => setSettlementAmounts(prev => ({ ...prev, [claim.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="border-green-500 text-green-700" onClick={async () => {
                           const amount = settlementAmounts[claim.id];
                           const numAmount = Number(amount);
                           if (!amount || isNaN(numAmount) || numAmount <= 0) {
                             toast.error("Please enter a valid positive settlement amount");
                             return;
                           }
                           try {
                             const res = await fetch(`/api/welfare/claims/${claim.id}/status`, {
                               method: "PUT",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify({ status: "SETTLED", settlementAmount: numAmount })
                             });
                             const data = await res.json();
                             if (!res.ok) throw new Error(data.error || "Failed to settle claim");
                             toast.success("Claim settled successfully");
                             fetchData();
                           } catch (err) {
                             toast.error(err.message || "An error occurred");
                           }
                        }}>
                          Mark as Settled
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
