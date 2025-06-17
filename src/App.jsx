// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Startseite from './pages/Startseite';
import Forbidden from './pages/Forbidden';
import SupervisorPanel from './pages/SupervisorPanel';
import AdminPanel from './pages/AdminPanel';
import Reklamationen from './pages/Reklamationen'; // ⬅️ hinzugefügt
import ProtectedRoute from './components/ProtectedRoute';
import PrivateRoute from './lib/PrivateRoute';

function App() {
  return (
    <Routes>
      {/* Öffentliche Login-Seite */}
      <Route path="/" element={<Login />} />

      {/* Geschützte Startseite für alle eingeloggten User */}
      <Route
        path="/start"
        element={
          <ProtectedRoute>
            <Startseite />
          </ProtectedRoute>
        }
      />

      {/* NEU: Geschützte Reklamationsseite – noch ohne Rollenprüfung */}
      <Route
        path="/reklamationen"
        element={
          <ProtectedRoute>
            <Reklamationen />
          </ProtectedRoute>
        }
      />

      {/* Supervisor-Panel: Nur für Supervisor + Admin */}
      <Route
        path="/supervisor"
        element={
          <PrivateRoute roles={['Supervisor', 'Admin']}>
            <SupervisorPanel />
          </PrivateRoute>
        }
      />

      {/* Admin-Panel: Nur für Admin */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['Admin']}>
            <AdminPanel />
          </PrivateRoute>
        }
      />

      {/* Kein Zugriff */}
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
