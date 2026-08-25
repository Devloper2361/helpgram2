import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

export function CatalogAdminRoute({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>{t("ui.loading")}</div>;
  }
  
  if (!user || (user.role !== "ADMIN" && user.role !== "PLATFORM_ADMIN" && user.role !== "FEDERATION_ADMIN")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
