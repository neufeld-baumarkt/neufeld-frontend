// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const user = JSON.parse(sessionStorage.getItem('user')); // ⬅️ wurde angepasst!
  if (!user) return <Navigate to="/" />;
  return children;
}
