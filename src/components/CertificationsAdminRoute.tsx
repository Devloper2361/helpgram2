import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

export function CertificationsAdminRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return <div>{t("ui.loading")}</div>;
  }

  const allowedRoles = ["ADMIN", "PLATFORM_ADMIN", "SOCIETY_ADMIN", "FEDERATION_ADMIN"];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
