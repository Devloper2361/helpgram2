import React, { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle, Activity, Info, Sparkles } from "lucide-react";
import { useTranslation } from "../i18n";

export function IntelligencePanel({ type, id }: { type: "society" | "federation", id?: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  const generateAiInsight = async () => {
    setIsGeneratingAi(true);
    setAiError("");
    setAiInsight(null);
    try {
      const payload = type === "society" ? { societyId: id } : { federationId: id };
      const endpoint = type === "society" ? "/api/intelligence/insights" : "/api/intelligence/federation/insights";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      
      if (!res.ok) throw new Error(resData.error || "Failed to generate AI insight");
      if (resData.aiAvailable === false) throw new Error(resData.message || "AI interpretation is temporarily unavailable.");
      
      setAiInsight(resData.insights);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    let url = `/api/intelligence/${type}`;
    if (id) {
      url += `?${type}Id=${id}`;
    }
    
    fetch(url)
    .then(res => res.json())
    .then(resData => {
      if (resData.error) throw new Error(resData.error);
      setData(resData);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <div className="p-4 border rounded-xl animate-pulse bg-white">Loading intelligence data...</div>;
  if (error) return <div className="p-4 border border-red-200 text-red-600 rounded-xl bg-red-50">Error loading intelligence: {typeof error === 'string' ? error : JSON.stringify(error)}</div>;
  if (!data) return null;

  const isLowConfidence = data.metadata?.confidence?.toLowerCase().includes("low") || data.summary?.tasksPast30Days <= 20;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-xl text-gray-900">Deterministic Demand Trend</h3>
      </div>
      
      {isLowConfidence && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 flex gap-2 shadow-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-orange-600" />
          <p><strong>Insufficient historical data.</strong> There have been 20 or fewer tasks in the past 30 days. Trend confidence is limited, but current upcoming workload and workforce supply are shown below.</p>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Active Workers</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.totalActiveWorkers || 0}</p>
        </div>
        <div className="bg-white border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tasks (Past 30 Days)</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.tasksPast30Days || 0}</p>
        </div>
        <div className="bg-white border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Upcoming (7 Days)</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.upcomingTasks7Days || 0}</p>
        </div>
        {type === "federation" && (
          <div className="bg-white border p-4 rounded-xl shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Societies</p>
            <p className="text-2xl font-bold text-gray-900">{data.summary?.totalSocieties || 0}</p>
          </div>
        )}
      </div>

      {/* Demand Trends */}
      <div>
        <h3 className="font-semibold text-lg mb-3 text-gray-800">Service Demand Trends</h3>
        {!data.demandTrend || data.demandTrend.length === 0 ? (
          <p className="text-gray-500 text-sm">No active services or tasks in the recent period.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.demandTrend.map((trend: any, idx: number) => (
              <div key={idx} className="bg-white border p-4 rounded-xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-900 line-clamp-1" title={trend.service}>{trend.service}</h4>
                    <span className={`shrink-0 flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                      trend.trend === 'RISING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                      trend.trend === 'DECLINING' ? 'bg-red-50 text-red-700 border border-red-100' : 
                      trend.trend === 'INSUFFICIENT DATA' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {trend.trend === 'RISING' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {trend.trend === 'DECLINING' && <TrendingDown className="w-3 h-3 mr-1" />}
                      {trend.trend === 'STABLE' && <Minus className="w-3 h-3 mr-1" />}
                      {trend.trend} {trend.change ? `(${trend.change > 0 ? '+' : ''}${trend.change}%)` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Past 30 Days</p>
                      <p className="text-sm font-semibold">{trend.past30} tasks</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Past 7 Days</p>
                      <p className="text-sm font-semibold">{trend.past7} tasks</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workforce Supply */}
      <div>
        <h3 className="font-semibold text-lg mb-3 text-gray-800">Workforce Skill Supply</h3>
        {!data.workforce || Object.keys(data.workforce).length === 0 ? (
          <p className="text-gray-500 text-sm">No workers with skills available.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.workforce).map(([skill, count]) => (
              <div key={skill} className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center">
                <span className="font-medium text-blue-900 text-sm">{skill}</span>
                <span className="ml-2 bg-blue-200 text-blue-900 text-xs py-0.5 px-2 rounded-full font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Workload */}
      <div>
        <h3 className="font-semibold text-lg mb-3 text-gray-800">Upcoming Workload (7 Days)</h3>
        {!data.upcomingWorkload || data.upcomingWorkload.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming tasks scheduled in the next 7 days.</p>
        ) : (
          <div className="space-y-3">
            {data.upcomingWorkload.map((task: any) => (
              <div key={task.id} className="bg-white border p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">{task.service}</span> • Skills: {task.skills}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{task.zone}</p>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    Priority: {task.priority}
                  </span>
                  <p className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    Requires {task.workerCount} workers
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI AI Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-lg text-gray-900">AI-Assisted Insights</h3>
          </div>
          <button 
            onClick={generateAiInsight} 
            disabled={isGeneratingAi || !data}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {isGeneratingAi ? "Analyzing Deterministic Data..." : "Generate AI Insight"}
          </button>
        </div>
        
        {aiError && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm mb-6 shadow-sm">
            <strong>AI Generation Failed:</strong> {aiError}
          </div>
        )}
        
        {aiInsight && Array.isArray(aiInsight) && (
          <div className="space-y-4">
             {aiInsight.map((insight: any, idx: number) => (
                <div key={idx} className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl space-y-3 shadow-sm">
                   <div className="flex justify-between items-start gap-4">
                      <h4 className="font-semibold text-purple-900">{insight.title}</h4>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                        insight.priority === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-200' : 
                        insight.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                         {insight.priority} Priority
                      </span>
                   </div>
                   <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                     <p className="text-sm text-gray-800"><strong className="text-purple-900">Observation:</strong> {insight.observation}</p>
                   </div>
                   <div className="bg-white/60 p-3 rounded-lg border border-purple-100">
                     <p className="text-sm text-purple-800"><strong>Recommendation:</strong> {insight.recommendation}</p>
                   </div>
                   <p className="text-xs text-gray-500 italic mt-2 ml-1">
                     {insight.reason} • <span className="font-medium">Confidence: {insight.confidence}</span>
                   </p>
                </div>
             ))}
             <div className="mt-4 pt-3 text-xs text-purple-700/70 italic border-t border-purple-200 text-center">
               AI insights are advisory only and based solely on the deterministic data shown above.
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
