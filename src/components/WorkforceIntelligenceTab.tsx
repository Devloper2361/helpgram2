import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { format } from "date-fns";


interface IntelligenceData {
  summary: {
    totalActiveWorkers: number;
    tasksPast30Days: number;
    upcomingTasks7Days: number;
  };
  demandTrend: {
    service: string;
    past7: number;
    past30: number;
    runRate7: number;
    runRate30: number;
    trend: string;
    change: number;
    priority: string;
  }[];
  workforce: Record<string, number>;
  gaps: {
    skill: string;
    upcomingTasksRequired: number;
    availableWorkers: number;
    coverage: string;
    priority: string;
  }[];
  spatial: {
    tasks: { lat: number; lng: number; type: string; status: string; count?: number }[];
    workers: { lat: number; lng: number; role: string; count?: number }[];
  };
  upcomingWorkload: {
    id: string;
    title: string;
    service: string;
    skills: string;
    scheduledFor: string;
    workerCount: number;
    status: string;
    zone: string;
    priority: string;
  }[];
  metadata: {
    historicalWindow: string;
    forecastWindow: string;
    confidence: string;
  };
}

export function WorkforceIntelligenceTab({ societyId }: { societyId: string }) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntelligence();
  }, [societyId]);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/intelligence/society?societyId=${societyId}`);
      if (!res.ok) throw new Error("Failed to load intelligence data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("CLICK TRIGGERED, starting fetch to /api/intelligence/insights");

    try {
      setInsightsLoading(true);
      setAiError(null);
      console.log("SENDING REQUEST with payload:", { societyId });
      const res = await fetch(`/api/intelligence/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ societyId }),
      });
      console.log("HTTP STATUS:", res.status);
      if (res.ok) {
        console.log("RESPONSE OK");

        const json = await res.json();
        setInsights(json.insights || []);
      } else {
        const errText = await res.text();
        console.log("SERVER ERROR BODY:", errText);
        setAiError(`HTTP ${res.status}: AI insights are temporarily unavailable.`);
      }
    } catch (err: any) {
      console.log("FRONTEND CATCH ERROR:", err.message);

      console.error(err);
      setAiError("AI insights are temporarily unavailable. Workforce analytics are still available.");
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading deterministic intelligence...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  // Format data for charts
  const trendData = data.demandTrend.map(d => ({
    name: d.service,
    "Last 30 Days (Avg/7D)": parseFloat((d.past30 / (30/7)).toFixed(1)),
    "Last 7 Days": d.past7
  }));

  const gapData = data.gaps.map(g => ({
    name: g.skill,
    "Scheduled Demand": g.upcomingTasksRequired,
    "Skill Supply": g.availableWorkers,
  }));

  const centerLat = data.spatial.tasks.length > 0 ? data.spatial.tasks[0].lat : 20.296;
  const centerLng = data.spatial.tasks.length > 0 ? data.spatial.tasks[0].lng : 85.824;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workforce Intelligence</h2>
          <p className="text-muted-foreground">Understand demand trends, eligible workforce supply, and emerging skill gaps.</p>
        </div>
        <div className="text-sm text-right text-muted-foreground">
          <p>Confidence: <Badge variant="outline">{data.metadata.confidence}</Badge></p>
          <p>Historical: {data.metadata.historicalWindow} | Scheduled Pipeline: {data.metadata.forecastWindow}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Historical Demand</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.summary.tasksPast30Days} tasks</div><p className="text-xs text-muted-foreground">Past 30 days</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Short-Term Demand Intelligence</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.summary.upcomingTasks7Days} tasks</div><p className="text-xs text-muted-foreground">Next 7 days pipeline</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Eligible Workforce</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.summary.totalActiveWorkers} active</div><p className="text-xs text-muted-foreground">Across all skills</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">AI Insights</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{insightsLoading ? "Analyzing..." : insights.length} generated</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Demand Trend & Scheduled Pipeline</CardTitle>
            <p className="text-sm text-muted-foreground">Comparing recent 7-day volume vs 30-day baseline.</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="Last 30 Days (Avg/7D)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Last 7 Days" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Skill Supply vs Scheduled Demand</CardTitle>
            <p className="text-sm text-muted-foreground">Scheduled demand (7 days) vs Eligible skill supply.</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="Scheduled Demand" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Skill Supply" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Geographic Intelligence</CardTitle>
            <p className="text-sm text-muted-foreground">Demand hotspots (Red) vs Workforce distribution (Green).</p>
          </CardHeader>
          <CardContent className="h-[400px] p-0 relative z-0">
             <MapContainer center={[centerLat, centerLng]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0, borderRadius: "0 0 0.5rem 0.5rem" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {data.spatial.tasks.map((t, i) => (
                  <CircleMarker key={`t-${i}`} center={[t.lat, t.lng]} pathOptions={{ fillColor: '#ef4444', color: '#ef4444' }} radius={Math.max(5, Math.min(12, (t.count || 1) * 2))} fillOpacity={0.6}>
                    <LeafletTooltip>Task Demand: {t.count || 1}</LeafletTooltip>
                  </CircleMarker>
                ))}
                {data.spatial.workers.map((w, i) => (
                  <CircleMarker key={`w-${i}`} center={[w.lat, w.lng]} pathOptions={{ fillColor: '#22c55e', color: '#22c55e' }} radius={Math.max(4, Math.min(10, (w.count || 1) * 2))} fillOpacity={0.6}>
                    <LeafletTooltip>Worker Density: {w.count || 1}</LeafletTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>AI Workforce Advisor</CardTitle>
              <p className="text-sm text-muted-foreground">Derived from calculated metrics.</p>
            </div>
            <Button size="sm" onClick={generateInsights} disabled={insightsLoading}>
              {insightsLoading ? "Analyzing..." : (insights.length > 0 || aiError) ? "Regenerate Insights" : "Generate Insights"}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {aiError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                {aiError}
              </div>
            )}
            {insightsLoading ? (
               <div className="space-y-4">
                 {[1,2,3].map(i => (
                   <div key={i} className="animate-pulse space-y-2">
                     <div className="h-4 bg-muted rounded w-3/4"></div>
                     <div className="h-3 bg-muted rounded w-full"></div>
                     <div className="h-3 bg-muted rounded w-5/6"></div>
                   </div>
                 ))}
               </div>
            ) : insights.length === 0 ? (
               <div className="text-muted-foreground text-sm">No actionable insights generated.</div>
            ) : (
               <div className="space-y-4">
                 {insights.map((insight, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border text-sm space-y-2 ${insight.priority === 'HIGH' ? 'bg-red-50/50 border-red-100' : insight.priority === 'MEDIUM' ? 'bg-yellow-50/50 border-yellow-100' : 'bg-muted/30 border-border/50'}`}>
                      <div className="flex items-start justify-between">
                        <strong className="font-semibold text-foreground">{insight.title}</strong>
                        <div className="flex gap-2">
                          <Badge variant={insight.priority === 'HIGH' ? 'destructive' : insight.priority === 'MEDIUM' ? 'default' : 'secondary'} className="text-[10px] uppercase">{insight.priority}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">Conf: {insight.confidence}</Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">Observation:</span> {insight.observation}
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">Recommendation:</span> {insight.recommendation}
                      </p>
                      <p className="text-muted-foreground leading-relaxed text-xs italic">
                        <span className="font-medium not-italic text-foreground">Reason:</span> {insight.reason}
                      </p>
                    </div>
                 ))}
               </div>
            )}
            
            {insights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">How this insight was generated</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Based on 30-day service demand and recent 7-day trend.</li>
                  <li>• Evaluates upcoming workload against eligible skill supply.</li>
                  <li>• Analyzes geographic demand density vs workforce distribution.</li>
                  <li>• AI Advisor only recommends actions based on strictly deterministic data.</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Skill Coverage Indicator</CardTitle>
            <p className="text-sm text-muted-foreground">Deterministic skill demand vs eligible workforce.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                <tr className="border-b last:border-0">
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 font-medium text-right">Demand</th>
                  <th className="px-4 py-3 font-medium text-right">Supply</th>
                  <th className="px-4 py-3 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {data.gaps.map((g, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{g.skill}</td>
                    <td className="px-4 py-3 text-right">{g.upcomingTasksRequired}</td>
                    <td className="px-4 py-3 text-right">{g.availableWorkers}</td>
                    <td className="px-4 py-3">
                      <Badge variant={g.priority === "HIGH" ? "destructive" : g.priority === "MEDIUM" ? "default" : "secondary"}>
                        {g.coverage}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.gaps.length === 0 && (
                  <tr className="border-b last:border-0">
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No skill gap data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Scheduled Workload</CardTitle>
            <p className="text-sm text-muted-foreground">Next 7 days pipeline.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                <tr className="border-b last:border-0">
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Skills</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingWorkload && data.upcomingWorkload.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{t.service}</td>
                    <td className="px-4 py-3">{t.skills}</td>
                    <td className="px-4 py-3">{format(new Date(t.scheduledFor), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.zone}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.priority === "HIGH" ? "destructive" : t.priority === "MEDIUM" ? "default" : "secondary"}>
                        {t.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!data.upcomingWorkload || data.upcomingWorkload.length === 0) && (
                  <tr className="border-b last:border-0">
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No upcoming tasks scheduled.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
