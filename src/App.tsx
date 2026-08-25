/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./MainLayout";

import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { CatalogAdminRoute } from "./components/CatalogAdminRoute";

import DashboardPage from "./pages/Dashboard";
import MarketplacePage from "./pages/Marketplace";
import MyTasksPage from "./pages/MyTasks";
import CreateTaskPage from "./pages/CreateTask";
import TaskDetailPage from "./pages/TaskDetail";
import { InvoicePage } from "./pages/InvoicePage";
import WalletPage from "./pages/Wallet";
import ChatPage from "./pages/Chat";
import ProfilePage from "./pages/Profile";
import PublicProfilePage from "./pages/PublicProfile";

import AdminPage from "./pages/Admin";

import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";

import CatalogPage from "./pages/Catalog";
import CatalogAdminPage from "./pages/CatalogAdmin";

import CooperativesPage from "./pages/Cooperatives";
import SocietyDashboardPage from "./pages/SocietyDashboard";
import FederationDashboardPage from "./pages/FederationDashboard";

import WelfareDashboard from "./pages/WelfareDashboard";
import WelfareAdmin from "./pages/WelfareAdmin";

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Router>
          <Routes>

            {/* =========================
                PUBLIC AUTH ROUTES
               ========================= */}

            <Route
              path="/auth/login"
              element={<LoginPage />}
            />

            <Route
              path="/auth/register"
              element={<RegisterPage />}
            />


            {/* =========================
                PROTECTED APPLICATION
               ========================= */}

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >

              {/* Dashboard */}
              <Route
                index
                element={<DashboardPage />}
              />

              {/* Tasks */}
              <Route
                path="my-tasks"
                element={<MyTasksPage />}
              />

              <Route
                path="tasks"
                element={<MarketplacePage />}
              />

              <Route
                path="tasks/new"
                element={<CreateTaskPage />}
              />

              <Route
                path="tasks/:id"
                element={<TaskDetailPage />}
              />

              <Route
                path="tasks/:id/invoice"
                element={<InvoicePage />}
              />


              {/* Catalog */}
              <Route
                path="catalog"
                element={<CatalogPage />}
              />

              <Route
                path="catalog-admin"
                element={
                  <CatalogAdminRoute>
                    <CatalogAdminPage />
                  </CatalogAdminRoute>
                }
              />


              {/* Cooperatives */}
              <Route
                path="cooperatives"
                element={<CooperativesPage />}
              />

              <Route
                path="society/dashboard"
                element={<SocietyDashboardPage />}
              />

              <Route
                path="federation/dashboard"
                element={<FederationDashboardPage />}
              />


              {/* =========================
                  WELFARE
                 ========================= */}

              <Route
                path="welfare"
                element={<WelfareDashboard />}
              />

              <Route
                path="welfare/admin"
                element={<WelfareAdmin />}
              />


              {/* Wallet */}
              <Route
                path="wallet"
                element={<WalletPage />}
              />


              {/* Chat */}
              <Route
                path="chat"
                element={<ChatPage />}
              />


              {/* Profile */}
              <Route
                path="profile"
                element={<ProfilePage />}
              />

              <Route
                path="user/:userId"
                element={<PublicProfilePage />}
              />


              {/* Platform Admin */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />

            </Route>

          </Routes>
        </Router>
      </AuthProvider>
    </I18nProvider>
  );
}