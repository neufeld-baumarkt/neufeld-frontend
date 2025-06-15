import React from 'react';
import DashboardFiliale from './DashboardFiliale';
import DashboardSupervisor from './DashboardSupervisor';
import DashboardManager from './DashboardManager';
import DashboardGF from './DashboardGF';
import DashboardAdmin from './DashboardAdmin';

function Dashboard({ role }) {
  switch (role) {
    case 'Filiale':
      return <DashboardFiliale />;
    case 'Supervisor':
      return <DashboardSupervisor />;
    case 'Manager-1':
      return <DashboardManager />;
    case 'Geschäftsführer':
      return <DashboardGF />;
    case 'Admin':
      return <DashboardAdmin />;
    default:
      return <div>Unbekannte Rolle: {role}</div>;
  }
}

export default Dashboard;
