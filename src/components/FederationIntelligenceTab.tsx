import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { format } from "date-fns";

interface FederationIntelligenceData {
  summary: {
    totalSocieties: number;
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

export function FederationIntelligenceTab({ federationId }: { federationId?: string }) {
  const [data, setData] = useState<FederationIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntelligence();
  }, [federationId]);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const url = federationId ? `/api/intelligence/federation?federationId=${federationId}` : `/api/intelligence/federation`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load federation intelligence data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      setInsightsLoading(true);
      setAiError(null);
      const res = await fetch(`/api/intelligence/federation/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ federationId }),
      });
      if (res.ok) {
        const json = await res.json();
        setInsights(json.insights || []);
      } else {
        setAiError("AI insights are temporarily unavailable. Federation analytics are still available.");
      }
    } catch (err) {
      console.error(err);
      setAiError("AI insights are temporarily unavailable. Federation analytics are still available.");
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading federation intelligence...</div>;
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

  const requiresAttention = data.gaps.filter(g => g.priority === "HIGH").map(g => ({
    reason: `Skill Coverage is ${g.coverage}`,
    affected: `Skill: ${g.skill}`,
    priority: "HIGH"
  }));
  
  data.demandTrend.filter(d => d.priority === "HIGH").forEach(d => {
    requiresAttention.push({
      reason: `Demand is ${d.trend} (${d.change}%)`,
      affected: `Service: ${d.service}`,
      priority: "HIGH"
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Strategic Federation Intelligence</h2>
          <p className="text-sm text-muted-foreground">Federation-wide analysis across {data.summary.totalSocieties} participating societies.</p>
        </div>
        <div className="text-xs text-right text-muted-foreground">
          <p>Confidence: <Badge variant="outline">{data.metadata.confidence}</Badge></p>
          <p>Historical: {data.metadata.historicalWindow} | Scheduled: {data.metadata.forecastWindow}</p>
        </div>
      </div>

      {requiresAttention.length > 0 && (
        <Card className="border-red-200 bg-red-50/30 shadow-sm">
          <CardHeader className="py-4 border-b border-red-100">
             <CardTitle className="text-red-800 text-sm font-semibold flex items-center">
               <span className="relative flex h-2 w-2 mr-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               REQUIRES ATTENTION
             </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {requiresAttention.map((item, idx) => (
                 <div key={idx} className="flex flex-col bg-white p-3 rounded border border-red-100 shadow-sm">
                    <span className="text-xs font-semibold text-red-600 mb-1">{item.priority} PRIORITY</span>
                    <span className="text-sm font-medium">{item.affected}</span>
                    <span className="text-xs text-muted-foreground">{item.reason}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Federation Demand Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Comparing recent 7-day volume vs 30-day baseline.</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Last 30 Days (Avg/7D)" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={20} />
                <Bar dataKey="Last 7 Days" fill="#0f172a" radius={[2, 2, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Federation Skill Coverage</CardTitle>
            <p className="text-xs text-muted-foreground">Federation scheduled demand vs Eligible skill supply.</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Scheduled Demand" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Skill Supply" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Aggregated Demand Areas</CardTitle>
            <p className="text-xs text-muted-foreground">Federation demand hotspots (Red) vs Workforce distribution (Green).</p>
          </CardHeader>
          <CardContent className="h-[350px] p-0 relative z-0">
             <MapContainer center={[centerLat, centerLng]} zoom={10} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 0, borderRadius: "0 0 0.5rem 0.5rem" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {data.spatial.tasks.map((t, i) => (
                  <CircleMarker key={`t-${i}`} center={[t.lat, t.lng]} pathOptions={{ fillColor: '#ef4444', color: '#ef4444' }} radius={Math.max(5, Math.min(15, (t.count || 1) * 3))} fillOpacity={0.6}>
                    <LeafletTooltip>Demand Area: {t.count || 1} occurrences</LeafletTooltip>
                  </CircleMarker>
                ))}
                {data.spatial.workers.map((w, i) => (
                  <CircleMarker key={`w-${i}`} center={[w.lat, w.lng]} pathOptions={{ fillColor: '#22c55e', color: '#22c55e' }} radius={Math.max(4, Math.min(12, (w.count || 1) * 3))} fillOpacity={0.6}>
                    <LeafletTooltip>Workforce Area: {w.count || 1} available profiles</LeafletTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 flex flex-col shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-slate-50 border-b pb-4">
            <div>
              <CardTitle className="text-base">AI Federation Advisor</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">Generates strictly advisory strategic insights.</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={generateInsights} disabled={insightsLoading}>
              {insightsLoading ? "Analyzing..." : (insights.length > 0 || aiError) ? "Regenerate" : "Generate"}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-4 bg-slate-50/50">
            {aiError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                {aiError}
              </div>
            )}
            {insightsLoading ? (
               <div className="space-y-4">
                 {[1,2,3].map(i => (
                   <div key={i} className="animate-pulse space-y-2">
                     <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                     <div className="h-2 bg-slate-200 rounded w-full"></div>
                     <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                   </div>
                 ))}
               </div>
            ) : insights.length === 0 ? (
               <div className="text-muted-foreground text-xs text-center py-8">Click generate to receive federation-wide planning recommendations.</div>
            ) : (
               <div className="space-y-3">
                 {insights.map((insight, idx) => (
                    <div key={idx} className={`p-3 rounded border text-xs space-y-1.5 ${insight.priority === 'HIGH' ? 'bg-red-50/50 border-red-100' : insight.priority === 'MEDIUM' ? 'bg-yellow-50/50 border-yellow-100' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <strong className="font-semibold text-slate-800">{insight.title}</strong>
                        <Badge variant={insight.priority === 'HIGH' ? 'destructive' : insight.priority === 'MEDIUM' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1 py-0">{insight.priority}</Badge>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        <span className="font-medium text-slate-700">Observed:</span> {insight.observation}
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        <span className="font-medium text-slate-700">Action:</span> {insight.recommendation}
                      </p>
                    </div>
                 ))}
               </div>
            )}
            
            {insights.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1">Transparency Statement</p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  AI recommendations are advisory and do not automatically assign or dispatch workers. Generated using deterministic metrics across societies.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Federation Skill Coverage Matrix</CardTitle>
            <p className="text-xs text-muted-foreground">Aggregated skill gaps across all societies.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-slate-50 text-slate-500">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Skill Category</th>
                  <th className="px-4 py-2 font-medium text-right">Upcoming Demand</th>
                  <th className="px-4 py-2 font-medium text-right">Eligible Workforce</th>
                  <th className="px-4 py-2 font-medium">Indicator</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {data.gaps.map((g, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium">{g.skill}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{g.upcomingTasksRequired}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{g.availableWorkers}</td>
                    <td className="px-4 py-2">
                      <Badge className="text-[9px]" variant={g.priority === "HIGH" ? "destructive" : g.priority === "MEDIUM" ? "default" : "secondary"}>
                        {g.coverage}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.gaps.length === 0 && (
                  <tr className="border-b last:border-0">
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No skill gaps identified.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Federation Upcoming Workload</CardTitle>
            <p className="text-xs text-muted-foreground">Next 7 days scheduled pipeline.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-slate-50 text-slate-500">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Scheduled</th>
                  <th className="px-4 py-2 font-medium">Demand Area</th>
                  <th className="px-4 py-2 font-medium">Attention</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {data.upcomingWorkload && data.upcomingWorkload.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium truncate max-w-[150px]">{t.service}</td>
                    <td className="px-4 py-2 text-slate-600">{format(new Date(t.scheduledFor), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-2 text-slate-500 truncate max-w-[120px]">{t.zone}</td>
                    <td className="px-4 py-2">
                      <Badge className="text-[9px]" variant={t.priority === "HIGH" ? "destructive" : t.priority === "MEDIUM" ? "default" : "secondary"}>
                        {t.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!data.upcomingWorkload || data.upcomingWorkload.length === 0) && (
                  <tr className="border-b last:border-0">
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No upcoming workload scheduled.</td>
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
