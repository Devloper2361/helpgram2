import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../i18n";

export default function CatalogPage() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then(res => res.json()),
      fetch("/api/services").then(res => res.json())
    ]).then(([catData, servData]) => {
      if (catData.categories) setCategories(catData.categories);
      if (servData.services) setServices(servData.services);
      setLoading(false);
    }).catch(err => {
      console.log(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("ui.loading_services")}</div>;
  }

  const filteredServices = selectedCategory 
    ? services.filter(s => s.categoryId === selectedCategory)
    : services;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("ui.service_catalog")}</h2>
          <p className="text-slate-500">{t("ui.browse_available_services")}</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <Button 
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          className="whitespace-nowrap shrink-0"
        >
          {t("ui.all_categories")}</Button>
        {categories.map(c => (
          <Button 
            key={c.id}
            variant={selectedCategory === c.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(c.id)}
            className="whitespace-nowrap shrink-0"
          >
            {c.name}
          </Button>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center p-8 bg-white border rounded-xl text-slate-500">
          {t("ui.no_service_categories")}</div>
      )}

      {categories.length > 0 && filteredServices.length === 0 && (
        <div className="text-center p-8 bg-white border rounded-xl text-slate-500">
          {t("ui.no_services_available")}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(service => {
          const cat = categories.find(c => c.id === service.categoryId);
          return (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {cat?.name || "Uncategorized"}
                  </span>
                  <span className="font-bold text-lg">
                    ${Number(service.basePrice).toFixed(2)}
                  </span>
                </div>
                <CardTitle className="text-xl">{service.name}</CardTitle>
                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 border-t">
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/tasks/new?serviceId=${service.id}`)}
                >
                  {t("ui.book_this_service")}</Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
