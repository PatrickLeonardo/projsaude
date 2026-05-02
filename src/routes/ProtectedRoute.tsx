import { Navigate, Outlet } from "react-router-dom";
import { getAuthToken } from "../services/api";

export function ProtectedRoute() {
  const token = getAuthToken();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
