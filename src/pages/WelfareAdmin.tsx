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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  // Profile Edit State
  const [isCovered, setIsCovered] = useState(false);
  const [coverageType, setCoverageType] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workersRes, claimsRes] = await Promise.all([
        fetch("/api/welfare/workers"),
        fetch("/api/welfare/claims")
      ]);
      
      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers);
      }
      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims);
      }
    } catch (e) {
      console.error(e?.message || e);
      setError("Failed to load welfare data");
    } finally {
      setLoading(false);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    try {
      const res = await fetch(`/api/welfare/claims/${claimId}/status`, {
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
    } catch (e) {
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
          ...(policyNumber && { policyNumber })
        })
      });
      if (res.ok) {
        setSelectedWorker(null);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch (e) {
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
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Welfare Management</h1>
      </div>
      
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-md">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

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
                    <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => openProfileDialog(worker)} />}>
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
                              <label className="block text-sm font-medium mb-1">Coverage Type</label>
                              <Input value={coverageType} onChange={e => setCoverageType(e.target.value)} />
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
