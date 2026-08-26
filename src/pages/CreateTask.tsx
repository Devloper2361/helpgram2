import { useState, useEffect } from "react";
import { useTranslation } from "../i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles } from "lucide-react";
import { MapProvider } from "@/components/MapProvider";
import { LocationPicker, LocationData } from "@/components/LocationPicker";

export default function CreateTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get("serviceId") || "";
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    serviceId: initialServiceId,
    title: "",
    description: "",
    scheduledFor: "",
    locationLat: 0,
    locationLng: 0,
    address: "",
    landmark: "",
    city: "",
    state: "",
    isEmergency: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);

  // AI States
  const [aiProblem, setAiProblem] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");

  const handleAIGenerate = async () => {
    if (aiProblem.length < 10) {
      setAiError("Please provide more detail (min 10 chars).");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiSuccessMsg("");
    
    try {
      const res = await fetch("/api/ai/suggest-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: aiProblem })
      });
      
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          serviceId: data.serviceId,
          title: data.title,
          description: data.description
        }));
        setAiSuccessMsg(`Suggested Service: ${data.serviceName} - ${data.shortReason}`);
      } else {
        const err = await res.json();
        setAiError(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Failed to generate AI suggestion."));
      }
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : "Failed to connect to AI assistant.";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/services")
      .then(res => res.json())
      .then(data => {
        if (data.services) setServices(data.services);
      })
      .catch(err => console.error("Failed to load services", err?.message || err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSelected || typeof form.locationLat !== "number" || typeof form.locationLng !== "number") {
      setError("Please select a location from the map.");
      return;
    }
    if (!form.serviceId) {
      setError("Please select a service.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const scheduledDate = form.isEmergency ? new Date().toISOString() : new Date(form.scheduledFor).toISOString();
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: form.serviceId,
          title: form.title,
          description: form.description,
          scheduledFor: scheduledDate,
          locationLat: form.locationLat,
          locationLng: form.locationLng,
          address: form.address,
          landmark: form.landmark,
          city: form.city,
          state: form.state,
          isEmergency: form.isEmergency,
        })
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/tasks/${data.task.id}`);
      } else {
        const err = await res.json();
        if (err.error === "ACCOUNT_RESTRICTED") {
          setError(err.message);
        } else {
          setError(typeof err.error === 'string' ? err.error : JSON.stringify(err.error || "Failed to create task"));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MapProvider>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("ui.post_a_new")}</CardTitle>
            <CardDescription>{t("ui.describe_what_you")}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
            
            <div className="mb-6 p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Bot className="h-5 w-5" />
                <h3 className="font-semibold">{t("ui.ai_task_assistant")}</h3>
              </div>
              <p className="text-sm text-slate-600">{t("ui.not_sure_what")}</p>
              
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <textarea
                    value={aiProblem}
                    onChange={e => setAiProblem(e.target.value)}
                    placeholder="e.g. My AC is blowing hot air and making a rattling noise..."
                    className="w-full text-sm p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-h-[80px] resize-none"
                    maxLength={1000}
                  />
                  {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                </div>
                <Button 
                  type="button" 
                  onClick={handleAIGenerate} 
                  disabled={aiLoading || aiProblem.length < 10}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {aiLoading ? "Thinking..." : <><Sparkles className="h-4 w-4 mr-2" /> {t("ui.generate")}</>}
                </Button>
              </div>
              
              {aiSuccessMsg && (
                <div className="p-3 bg-white border border-blue-100 rounded-lg text-sm text-blue-800">
                  {aiSuccessMsg}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                
                
                <div className="flex items-center space-x-2 bg-red-50 p-4 rounded-md border border-red-200">
                  <input
                    type="checkbox"
                    id="isEmergency"
                    checked={form.isEmergency}
                    onChange={e => setForm({...form, isEmergency: e.target.checked})}
                    className="w-5 h-5 text-red-600 rounded"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="isEmergency" className="font-medium text-red-800">
                      {t("ui.emergency_on_demand")}</label>
                    <span className="text-sm text-red-600">
                      {t("ui.check_this_box")}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t("ui.service")}</label>

                  <select
                    required
                    value={form.serviceId}
                    onChange={e => setForm({...form, serviceId: e.target.value})}
                    className="w-full border rounded-md p-2 bg-background"
                  >
                    <option value="">{t("ui.select_a_service")}</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - ${Number(s.basePrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t("ui.title")}</label>
                  <input 
                    type="text" required minLength={5}
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="e.g. Fix my sink"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t("ui.description")}</label>
                  <textarea 
                    required minLength={10} rows={4}
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full border rounded-md p-2"
                    placeholder="Please describe the task in detail..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t("ui.scheduled_date_time")}</label>
                  <input 
                    type="datetime-local" required
                    value={form.scheduledFor} 
                    onChange={e => setForm({...form, scheduledFor: e.target.value})}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                
              </div>

              <div className="border-t pt-6"> 
                <h4 className="font-semibold mb-4 text-lg">{t("ui.task_location")}</h4> 
                <LocationPicker 
                    onLocationSelect={(loc) => {
                     setForm(prev => ({
                       ...prev,
                       ...loc
                     }));
                     setLocationSelected(
                       Number.isFinite(loc.locationLat) && Number.isFinite(loc.locationLng)
                     );
                   }} 
                 />
                 
                 {form.address && (
                  <div className="mt-4 p-4 bg-slate-50 border rounded-md">
                    <p className="font-medium">{form.address}</p>
                    {form.landmark && <p className="text-sm text-slate-600">{t("ui.landmark")}{form.landmark}</p>}
                    <p className="text-sm text-slate-500">{form.city}, {form.state}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>{t("task.cancel")}</Button>
                <Button type="submit" disabled={loading}>{loading ? "Posting..." : "Post Task"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MapProvider>
  );
}
