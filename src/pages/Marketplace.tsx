import { useTranslation } from "../i18n";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MapPin, Calendar, Clock, DollarSign, Search } from "lucide-react";

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "OPEN";
  const category = searchParams.get("category") || "ALL";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  useEffect(() => {
    fetchTasks();
  }, [page, search, status, category, minPrice, maxPrice]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
        ...(category !== "ALL" && { category }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice })
      });
      const res = await fetch(`/api/tasks?${params}`);

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        setTotal(data.total);
        setError(null);
      } else {
        const err = await res.json();
        if (err.error === "LOCATION_REQUIRED") {
          setError("Please set your service location in your profile to view nearby tasks.");
        } else {
          setError(err.message || "Failed to fetch tasks.");
        }
      }

    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("search") as HTMLInputElement;
    const minInput = form.elements.namedItem("minPrice") as HTMLInputElement;
    const maxInput = form.elements.namedItem("maxPrice") as HTMLInputElement;
    
    setSearchParams(prev => {
      prev.set("search", input.value);
      if (minInput.value) prev.set("minPrice", minInput.value);
      else prev.delete("minPrice");
      
      if (maxInput.value) prev.set("maxPrice", maxInput.value);
      else prev.delete("maxPrice");

      prev.set("page", "1");
      return prev;
    });
  };

  const setStatus = (val: string) => {
    setSearchParams(prev => {
      prev.set("status", val);
      prev.set("page", "1");
      return prev;
    });
  };

  const setCategory = (val: string) => {
    setSearchParams(prev => {
      prev.set("category", val);
      prev.set("page", "1");
      return prev;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("navigation.marketplace")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("ui.find_tasks_or")}</p>
        </div>
        <Link to="/tasks/new">
          <Button>{t("ui.post_a_task")}</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 w-full">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  name="search"
                  defaultValue={search}
                  placeholder="Search tasks by keyword..." 
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input 
                  name="minPrice"
                  type="number"
                  defaultValue={minPrice}
                  placeholder="Min $" 
                  className="w-24"
                />
                <Input 
                  name="maxPrice"
                  type="number"
                  defaultValue={maxPrice}
                  placeholder="Max $" 
                  className="w-24"
                />
                <Button type="submit" variant="secondary">{t("ui.search")}</Button>
              </div>
            </div>
            
            <div className="flex gap-4 w-full justify-start overflow-x-auto pb-1">
              <div className="w-48 shrink-0">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ui.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("ui.all_categories")}</SelectItem>
                    <SelectItem value="Home Services">{t("ui.home_services")}</SelectItem>
                    <SelectItem value="Delivery">{t("ui.delivery")}</SelectItem>
                    <SelectItem value="Tech Support">{t("ui.tech_support")}</SelectItem>
                    <SelectItem value="Handyman">{t("ui.handyman")}</SelectItem>
                    <SelectItem value="Cleaning">{t("ui.cleaning")}</SelectItem>
                    <SelectItem value="Moving">{t("ui.moving")}</SelectItem>
                    <SelectItem value="Other">{t("ui.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-48 shrink-0">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ui.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("ui.all_statuses")}</SelectItem>
                    <SelectItem value="OPEN">{t("ui.open")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("ui.in_progress")}</SelectItem>
                    <SelectItem value="COMPLETED">{t("ui.completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-10">{t("ui.loading_tasks")}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10 text-slate-500">{t("ui.no_tasks_found")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {tasks.map((task: any) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    
                    <Badge variant={task.status === "OPEN" ? "default" : "secondary"}>{task.status}</Badge>
                    {task.isEmergency && (
                      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white border-none font-bold">
                        {t("ui.emergency")}</Badge>
                    )}

                    {task.category && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        {task.category}
                      </Badge>
                    )}
                    {task.serviceId ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-50 border-none">
                        {t("ui.service_task")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100 border-none">
                        {t("ui.legacy_task")}</Badge>
                    )}
                  </div>
                  <span className="text-lg font-bold text-green-600 flex items-center">
                    <DollarSign className="h-4 w-4" />
                    {task.price}
                  </span>
                </div>
                <CardTitle className="text-xl line-clamp-1">{task.title}</CardTitle>
              </CardHeader>
              <CardContent className="py-4 flex-1">
                <p className="text-slate-600 text-sm line-clamp-2 mb-4">{task.description}</p>
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(task.scheduledFor).toLocaleDateString()}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                       {task.address ? (
                         <>
                           <span>{task.address}{task.city ? `, ${task.city}` : ''}</span>
                           {task.landmark && <span className="text-xs text-slate-400">{t("ui.near")}{task.landmark}</span>}
                         </>
                       ) : (
                         <span>{task.locationLat.toFixed(4)}, {task.locationLng.toFixed(4)}</span>
                       )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t("ui.requester")}</span> 
                    {task.requester?.profile?.fullName || task.requester?.email}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t bg-slate-50 p-4">
                <Link to={`/tasks/${task.id}`} className="w-full">
                  <Button variant="outline" className="w-full">{t("ui.view_details")}</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2 items-center mt-6">
          <Button 
            variant="outline" 
            disabled={page <= 1}
            onClick={() => setSearchParams(prev => { prev.set("page", String(page - 1)); return prev; })}
          >
            {t("ui.previous_2")}</Button>
          <span className="text-sm text-slate-500">{t("ui.page")}{page} {t("ui.of")}{Math.ceil(total / 10)}</span>
          <Button 
            variant="outline"
            disabled={page >= Math.ceil(total / 10)}
            onClick={() => setSearchParams(prev => { prev.set("page", String(page + 1)); return prev; })}
          >
            {t("ui.next")}</Button>
        </div>
      )}
    </div>
  );
}
