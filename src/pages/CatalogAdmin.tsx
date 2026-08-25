import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

export default function CatalogAdminPage() {
    const { t } = useTranslation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: "", name: "", description: "", federationId: "" });

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ id: "", name: "", description: "", basePrice: 0, categoryId: "" });

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [catRes, servRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/services")
      ]);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
      if (servRes.ok) {
        const data = await servRes.json();
        setServices(data.services || []);
      }
    } catch (e) {
      toast.error("Failed to fetch catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!categoryForm.id;
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/categories/${categoryForm.id}` : "/api/categories";
      
      const payload: any = {
        name: categoryForm.name,
        description: categoryForm.description
      };
      
      // FederationId is required for creation if they are Platform Admin
      if (!isEdit && categoryForm.federationId) {
        payload.federationId = categoryForm.federationId;
      }
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success(`Category ${isEdit ? 'updated' : 'created'}`);
        setShowCategoryForm(false);
        fetchCatalog();
      } else {
        const err = await res.json();
        toast.error(err.error || "Action failed");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Category deleted");
        fetchCatalog();
      } else {
        const err = await res.json();
        toast.error(err.error || "Action failed");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!serviceForm.id;
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/services/${serviceForm.id}` : "/api/services";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description,
          basePrice: Number(serviceForm.basePrice),
          categoryId: serviceForm.categoryId,
        })
      });
      
      if (res.ok) {
        toast.success(`Service ${isEdit ? 'updated' : 'created'}`);
        setShowServiceForm(false);
        fetchCatalog();
      } else {
        const err = await res.json();
        toast.error(err.error || "Action failed");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete service?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Service deleted");
        fetchCatalog();
      } else {
        const err = await res.json();
        toast.error(err.error || "Action failed");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t("ui.loading_catalog")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("ui.catalog_management")}</h2>
          <p className="text-slate-500">{t("ui.manage_service_categories")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("ui.categories")}</CardTitle>
              <CardDescription>{t("ui.manage_broad_service")}</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setCategoryForm({ id: "", name: "", description: "", federationId: "" });
                setShowCategoryForm(true);
              }}
            >
              {t("ui.add_category")}</Button>
          </CardHeader>
          <CardContent>
            {showCategoryForm && (
              <form onSubmit={saveCategory} className="bg-slate-50 p-4 rounded-lg mb-6 space-y-4 border">
                <h4 className="font-semibold">{categoryForm.id ? "Edit Category" : "New Category"}</h4>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.name")}</label>
                  <input required className="border p-2 rounded" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.description")}</label>
                  <textarea className="border p-2 rounded" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} />
                </div>
                {!categoryForm.id && (user?.role === "PLATFORM_ADMIN" || user?.role === "ADMIN") && (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-amber-600">{t("ui.federation_id_required")}</label>
                    <input className="border p-2 rounded" value={categoryForm.federationId} onChange={e => setCategoryForm({...categoryForm, federationId: e.target.value})} placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)}>{t("ui.cancel")}</Button>
                  <Button type="submit">{t("ui.save")}</Button>
                </div>
              </form>
            )}

            {categories.length === 0 ? (
              <div className="text-center p-4 text-slate-500 border rounded">{t("ui.no_categories_found")}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ui.name")}</TableHead>
                      <TableHead>{t("ui.services")}</TableHead>
                      <TableHead className="text-right">{t("ui.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{services.filter(s => s.categoryId === c.id).length}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setCategoryForm({ id: c.id, name: c.name, description: c.description || "", federationId: c.federationId || "" });
                            setShowCategoryForm(true);
                          }}>{t("ui.edit")}</Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteCategory(c.id)}>{t("ui.delete")}</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("ui.services")}</CardTitle>
              <CardDescription>{t("ui.manage_individual_services")}</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => {
                setServiceForm({ id: "", name: "", description: "", basePrice: 0, categoryId: "" });
                setShowServiceForm(true);
              }}
            >
              {t("ui.add_service")}</Button>
          </CardHeader>
          <CardContent>
            {showServiceForm && (
              <form onSubmit={saveService} className="bg-slate-50 p-4 rounded-lg mb-6 space-y-4 border">
                <h4 className="font-semibold">{serviceForm.id ? "Edit Service" : "New Service"}</h4>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.category")}</label>
                  <select required className="border p-2 rounded bg-white" value={serviceForm.categoryId} onChange={e => setServiceForm({...serviceForm, categoryId: e.target.value})}>
                    <option value="">{t("ui.select_category")}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.name")}</label>
                  <input required className="border p-2 rounded" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.base_price")}</label>
                  <input type="number" step="0.01" min="0" required className="border p-2 rounded" value={serviceForm.basePrice} onChange={e => setServiceForm({...serviceForm, basePrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("ui.description")}</label>
                  <textarea className="border p-2 rounded" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowServiceForm(false)}>{t("ui.cancel")}</Button>
                  <Button type="submit">{t("ui.save")}</Button>
                </div>
              </form>
            )}

            {services.length === 0 ? (
              <div className="text-center p-4 text-slate-500 border rounded">{t("ui.no_services_found")}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ui.service")}</TableHead>
                      <TableHead>{t("ui.category")}</TableHead>
                      <TableHead>{t("ui.price")}</TableHead>
                      <TableHead className="text-right">{t("ui.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map(s => {
                      const cat = categories.find(c => c.id === s.categoryId);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.name}
                            {!s.status || s.status !== "ACTIVE" ? <span className="ml-2 text-xs text-red-500">{t("ui.inactive")}</span> : null}
                          </TableCell>
                          <TableCell>{cat?.name || "None"}</TableCell>
                          <TableCell>${Number(s.basePrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setServiceForm({ id: s.id, name: s.name, description: s.description || "", basePrice: Number(s.basePrice), categoryId: s.categoryId });
                              setShowServiceForm(true);
                            }}>{t("ui.edit")}</Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteService(s.id)}>{t("ui.delete")}</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
