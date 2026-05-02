import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken, isAdminSession } from "../services/api";

export function AdminProtectedRoute() {
  const token = getAuthToken();
  const isAdmin = isAdminSession();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
