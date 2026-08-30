import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function InstitutionalContractsTab({ societyId, onRefresh }: { societyId: string, onRefresh: () => void }) {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [parentTasks, setParentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [claimOpp, setClaimOpp] = useState<any>(null);
  const [dispatchSubtask, setDispatchSubtask] = useState<any>(null);
  
  // AI Plan states
  const [selectedParentTask, setSelectedParentTask] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPlan, setAiPlan] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitConfirmOpen, setCommitConfirmOpen] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/institutional/opportunities`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpportunities(data.opportunities || []);
      setParentTasks(data.parentTasks || []);
    } catch(err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [societyId]);

  const handleClaim = async () => {
    if (!claimOpp) return;
    try {
      const res = await fetch(`/api/institutional/opportunities/${claimOpp.id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaimOpp(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateAiPlan = async (taskId: string) => {
    try {
      setPlanError(null);
      setIsGenerating(true);
      const res = await fetch(`/api/institutional/parent/${taskId}/ai-plan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiPlan(data.plan || []);
    } catch(err: any) {
      setPlanError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSubtask = (index: number, field: string, value: any) => {
    const newPlan = [...aiPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setAiPlan(newPlan);
  };

  const removeSubtask = (index: number) => {
    const newPlan = [...aiPlan];
    newPlan.splice(index, 1);
    setAiPlan(newPlan);
  };

  const handleCommitPlan = async () => {
    if (!selectedParentTask || aiPlan.length === 0) return;
    try {
      setCommitting(true);
      setPlanError(null);
      const res = await fetch(`/api/institutional/parent/${selectedParentTask.id}/commit-plan`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPlan)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setCommitConfirmOpen(false);
      setIsAiModalOpen(false);
      fetchData();
    } catch(err: any) {
      setPlanError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchSubtask) return;
    try {
      const res = await fetch(`/api/institutional/subtasks/${dispatchSubtask.id}/dispatch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDispatchSuccess(data.message || "Dispatched successfully");
      setTimeout(() => setDispatchSuccess(null), 5000);
      setDispatchSubtask(null);
      fetchData();
    } catch(err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-4">Loading contracts...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  const totalAllocated = aiPlan.reduce((sum, p) => sum + Number(p.allocatedBudget || 0), 0);
  const remaining = (selectedParentTask?.price || 0) - totalAllocated;
  const isOverBudget = remaining < 0;

  return (
    <div className="space-y-6">
      {dispatchSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md">
          {dispatchSuccess}
        </div>
      )}
      
      {/* Draft Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Available Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? <p className="text-sm text-slate-500">No opportunities available.</p> : 
            <div className="grid gap-4 md:grid-cols-2">
              {opportunities.map(opp => (
                <div key={opp.id} className="border p-4 rounded-lg flex flex-col justify-between shadow-sm bg-white">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{opp.title}</h3>
                      <Badge variant="secondary">{opp.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">{opp.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 mb-4">
                      <div><span className="font-medium text-slate-700">Budget:</span> ₹{opp.budget}</div>
                      <div><span className="font-medium text-slate-700">Deadline:</span> {new Date(opp.deadline).toLocaleDateString()}</div>
                      <div className="col-span-2"><span className="font-medium text-slate-700">Location:</span> Lat {opp.locationLat}, Lng {opp.locationLng}</div>
                    </div>
                  </div>
                  <Button onClick={() => setClaimOpp(opp)} className="w-full">Claim Contract</Button>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
      
      {/* Claimed Contracts (Parent Tasks) */}
      <Card>
        <CardHeader>
          <CardTitle>Claimed Contracts & Workforce Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {parentTasks.length === 0 ? <p className="text-sm text-slate-500">No claimed contracts.</p> : 
            <div className="space-y-6">
              {parentTasks.map(task => {
                const subtasks = task.subTasks || [];
                const allDispatched = subtasks.length > 0 && subtasks.every((st: any) => st.status !== "DRAFT");
                
                return (
                <div key={task.id} className="border p-5 rounded-lg shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge variant="outline">{allDispatched ? "DISPATCHED" : subtasks.length > 0 ? "PLANNED" : "IN PLANNING"}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">Budget: ₹{task.price}</p>
                    </div>
                    {subtasks.length === 0 && (
                      <Button onClick={() => { setSelectedParentTask(task); setAiPlan([]); setIsAiModalOpen(true); handleGenerateAiPlan(task.id); }}>
                        Open Workforce Planner
                      </Button>
                    )}
                  </div>
                  
                  {/* Subtasks */}
                  {subtasks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 text-slate-700">Institutional Subtasks</h4>
                      <div className="space-y-3">
                        {subtasks.map((st: any) => (
                          <div key={st.id} className="bg-slate-50 p-4 border rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-slate-900">{st.title}</p>
                                <Badge variant={st.status === "DRAFT" ? "secondary" : "default"}>
                                  {st.status === "DRAFT" ? "READY TO DISPATCH" : st.status}
                                </Badge>
                              </div>
                              <div className="flex gap-4 text-xs text-slate-500">
                                <span>Budget: ₹{st.price}</span>
                                <span>Workers: {st.workerCount}</span>
                              </div>
                            </div>
                            {st.status === "DRAFT" && (
                              <Button size="sm" onClick={() => setDispatchSubtask(st)}>Dispatch Workers</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          }
        </CardContent>
      </Card>

      {/* Claim Modal */}
      <Dialog open={!!claimOpp} onOpenChange={(open) => !open && setClaimOpp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to claim this institutional contract on behalf of your society?
            </DialogDescription>
          </DialogHeader>
          {claimOpp && (
            <div className="bg-slate-50 p-4 rounded-md space-y-2 text-sm">
              <p><strong>Contract Title:</strong> {claimOpp.title}</p>
              <p><strong>Description:</strong> {claimOpp.description}</p>
              <p><strong>Budget:</strong> ₹{claimOpp.budget}</p>
              <p><strong>Deadline:</strong> {new Date(claimOpp.deadline).toLocaleDateString()}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpp(null)}>Cancel</Button>
            <Button onClick={handleClaim}>Claim Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Modal */}
      <Dialog open={!!dispatchSubtask} onOpenChange={(open) => !open && setDispatchSubtask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Institutional Subtask</DialogTitle>
            <DialogDescription>
              This will dispatch the subtask to eligible cooperative workers.
            </DialogDescription>
          </DialogHeader>
          {dispatchSubtask && (
            <div className="bg-slate-50 p-4 rounded-md space-y-2 text-sm mb-2">
              <p><strong>Subtask:</strong> {dispatchSubtask.title}</p>
              <p><strong>Workers Required:</strong> {dispatchSubtask.workerCount}</p>
              <p><strong>Budget:</strong> ₹{dispatchSubtask.price}</p>
              <p className="mt-4 text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded text-xs">
                Workers will be selected using the cooperative's existing eligibility and FairShare ranking.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchSubtask(null)}>Cancel</Button>
            <Button onClick={handleDispatch}>Dispatch Workers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Confirm Modal */}
      <Dialog open={commitConfirmOpen} onOpenChange={setCommitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Workforce Plan</DialogTitle>
            <DialogDescription>
              This will create {aiPlan.length} institutional work packages totaling ₹{totalAllocated}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommitConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleCommitPlan} disabled={committing}>
              {committing ? "Committing..." : "Commit Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Workforce Planner</DialogTitle>
            <DialogDescription>
              AI-generated workforce recommendations. Final allocation remains under your control.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {selectedParentTask && (
              <div className="bg-slate-100 p-4 rounded-lg mb-6 border text-sm">
                <h4 className="font-semibold text-slate-800 mb-2">CONTRACT SUMMARY</h4>
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-slate-500">Contract:</span> {selectedParentTask.title}</p>
                  <p><span className="text-slate-500">Budget:</span> ₹{selectedParentTask.price}</p>
                  <p><span className="text-slate-500">Location:</span> Lat {selectedParentTask.locationLat}, Lng {selectedParentTask.locationLng}</p>
                </div>
              </div>
            )}

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-slate-500 font-medium">Generating intelligent workforce plan...</p>
              </div>
            ) : planError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex justify-between items-center">
                <p>{planError}</p>
                <Button variant="outline" size="sm" onClick={() => handleGenerateAiPlan(selectedParentTask?.id)}>Retry</Button>
              </div>
            ) : aiPlan.length === 0 ? (
              <div className="flex justify-center p-8">
                <Button onClick={() => handleGenerateAiPlan(selectedParentTask?.id)}>Generate Workforce Plan</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`flex justify-between items-center p-4 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-semibold">Contract Budget</p>
                      <p className="font-medium">₹{selectedParentTask?.price}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-semibold">Allocated</p>
                      <p className={`font-medium ${isOverBudget ? 'text-red-600' : ''}`}>₹{totalAllocated}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-semibold">Remaining</p>
                      <p className={`font-medium ${isOverBudget ? 'text-red-600' : ''}`}>₹{remaining}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleGenerateAiPlan(selectedParentTask?.id)}>Regenerate Plan</Button>
                </div>

                {isOverBudget && (
                  <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-md">
                    Validation Error: Allocated budget exceeds parent contract budget. Please adjust before committing.
                  </p>
                )}

                <div className="space-y-4">
                  {aiPlan.map((p, idx) => (
                    <div key={idx} className="border p-4 rounded-lg bg-white relative">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeSubtask(idx)}
                      >
                        Remove
                      </Button>
                      
                      <div className="grid gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Title</Label>
                          <Input value={p.title} onChange={(e) => updateSubtask(idx, 'title', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Description</Label>
                          <Input value={p.description} onChange={(e) => updateSubtask(idx, 'description', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Required Skills (comma-separated)</Label>
                            <Input 
                              value={(p.requiredSkills || []).join(", ")} 
                              onChange={(e) => updateSubtask(idx, 'requiredSkills', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} 
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Worker Count</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              value={p.recommendedWorkerCount} 
                              onChange={(e) => updateSubtask(idx, 'recommendedWorkerCount', parseInt(e.target.value) || 1)} 
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Allocated Budget (₹)</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              value={p.allocatedBudget} 
                              onChange={(e) => updateSubtask(idx, 'allocatedBudget', parseInt(e.target.value) || 0)} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsAiModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => setCommitConfirmOpen(true)} 
              disabled={isGenerating || aiPlan.length === 0 || committing || isOverBudget}
            >
              Commit Workforce Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
