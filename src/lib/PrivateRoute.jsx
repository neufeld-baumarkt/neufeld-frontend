// src/lib/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { getRole } from './auth';

export default function PrivateRoute({ children, roles }) {
  const userRole = getRole();

  if (!roles.includes(userRole)) {
    return <Navigate to="/forbidden" />;
  }

  return children;
}
