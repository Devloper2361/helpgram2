import React, { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle, Activity, Info, Sparkles } from "lucide-react";
import { useTranslation } from "../i18n";

export function IntelligencePanel({ type, id }: { type: "society" | "federation", id?: string }) {
    const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
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
      const payload = {
        type,
        targetId: id
      };
      
      const res = await fetch("/api/intelligence/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      
      if (!res.ok) throw new Error(resData.error || "Failed to generate AI insight");
      if (!resData.aiAvailable) throw new Error(resData.message || "AI interpretation is temporarily unavailable.");
      
      setAiInsight(resData.interpretation);
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
    
    // Authorization header removed; assumes HttpOnly cookies are sent automatically by fetch
    fetch(url)
    .then(res => res.json())
    .then(resData => {
      if (resData.error) throw new Error(resData.error);
      setData(resData.analytics || []);
      setLimitations(resData.limitations || []);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <div className="p-4 border rounded-xl animate-pulse">{t("ui.loading_ai_intelligence")}</div>;
  if (error) return <div className="p-4 border border-red-200 text-red-600 rounded-xl">{t("ui.intelligence_error")}{typeof error === 'string' ? error : JSON.stringify(error)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-lg">{t("ui.deterministic_demand_trend")}</h3>
      </div>
      
      {limitations.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <ul className="list-disc pl-4 space-y-1">
            {limitations.map((lim, idx) => <li key={idx}>{lim}</li>)}
          </ul>
        </div>
      )}
      
      {data.length === 0 ? (
        <p className="text-gray-500">{t("ui.no_active_services")}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{item.service.name}</h4>
                  <div className="flex gap-2">
                    {item.demand.trend === "RISING" && <span className="flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"><TrendingUp className="w-3 h-3 mr-1" /> {t("ui.rising")}{item.demand.growthPercent}%)</span>}
                    {item.demand.trend === "DECLINING" && <span className="flex items-center text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full"><TrendingDown className="w-3 h-3 mr-1" /> {t("ui.declining")}{item.demand.growthPercent}%)</span>}
                    {item.demand.trend === "STABLE" && <span className="flex items-center text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full"><Minus className="w-3 h-3 mr-1" /> {t("ui.stable")}</span>}
                    {item.demand.trend === "NEW_DEMAND" && <span className="flex items-center text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-full">{t("ui.new_demand")}</span>}
                    {item.demand.trend === "INSUFFICIENT_DATA" && <span className="flex items-center text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-full">{t("ui.not_enough_data")}</span>}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{t("ui.federation_demand_d")}</p>
                    <p className="text-lg font-semibold">{item.demand.last30Days} {t("ui.tasks")}</p>
                    <p className="text-xs text-gray-400">{t("ui.vs")}{item.demand.previous30Days} {t("ui.previous")}</p>
                    <p className="text-xs text-gray-400">{t("ui.data")}{item.demand.dataSufficiency}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {type === "society" ? "Society Workforce" : "Federation Workforce"}
                    </p>
                    {item.workforce.workersWithMatchingSkills === 0 ? (
                      <p className="text-lg font-semibold text-red-600">{t("ui.no_matching_workers")}</p>
                    ) : (
                      <p className="text-lg font-semibold">{item.workforce.workersWithMatchingSkills} {t("ui.with_matching_skills")}</p>
                    )}
                    <p className="text-xs text-gray-400">{item.workforce.certifiedWorkersWithMatchingSkills} {t("ui.verified_certifications")}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">{t("ui.mvp_workforce_pressure")}</p>
                  {item.workforce.mvpWorkforcePressure === "CRITICAL" && (
                    <p className="text-sm text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> {t("ui.critical_pressure")}</p>
                  )}
                  {item.workforce.mvpWorkforcePressure === "HIGH" && (
                    <p className="text-sm text-orange-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> {t("ui.high_pressure")}</p>
                  )}
                  {item.workforce.mvpWorkforcePressure === "MODERATE" && (
                    <p className="text-sm text-yellow-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> {t("ui.moderate_pressure")}</p>
                  )}
                  {item.workforce.mvpWorkforcePressure === "LOW" && (
                    <p className="text-sm text-emerald-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> {t("ui.healthy_low_pressure")}</p>
                  )}
                </div>

                {item.forecast && (
                  <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{t("ui.demand_forecast_days")}</p>
                    {item.forecast.forecastStatus === "AVAILABLE" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">{t("ui.predicted_demand")}</p>
                          <p className="text-sm font-medium">{item.forecast.predictedDemand} {t("ui.tasks")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t("ui.required_workers")}</p>
                          <p className="text-sm font-medium">{item.allocation.requiredWorkers}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t("ui.worker_shortage")}</p>
                          <p className="text-sm font-medium text-orange-600">{item.allocation.workerShortage}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t("ui.recommended_allocation")}</p>
                          <p className="text-sm font-medium text-emerald-600">{item.allocation.recommendedWorkerAllocation} {t("ui.workers")}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t("ui.insufficient_historical_data")}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-3 italic">{item.allocation?.workerCapacityAssumption || "Forecast derived from historical platform demand metrics."}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-lg">{t("ui.ai_assisted_interpretation")}</h3>
          </div>
          <button 
            onClick={generateAiInsight} 
            disabled={isGeneratingAi || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isGeneratingAi ? "Analyzing..." : "Generate AI Insight"}
          </button>
        </div>
        
        {aiError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm mb-4">
            {aiError}
          </div>
        )}
        
        {aiInsight && (
          <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl space-y-4 shadow-sm">
            <div>
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-purple-900">{t("ui.summary")}</h4>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  aiInsight.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                  aiInsight.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  aiInsight.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {aiInsight.priority} {t("ui.priority")}</span>
              </div>
              <p className="text-gray-700 text-sm">{aiInsight.summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-purple-900 mb-2 text-sm">{t("ui.key_insights")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                  {aiInsight.insights?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-2 text-sm">{t("ui.recommendations")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                  {aiInsight.recommendations?.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            </div>

            {aiInsight.limitations && aiInsight.limitations.length > 0 && (
              <div className="mt-3 p-3 bg-white/60 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-1 text-xs uppercase tracking-wider">{t("ui.limitations")}</h4>
                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                  {aiInsight.limitations.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )}
            
            <div className="pt-2 border-t border-purple-200/60 text-xs text-purple-700/70 italic">
              {t("ui.ai_insights_are")}</div>
          </div>
        )}
      </div>
</div>
  );
}
