import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Prospects from './pages/Prospects.jsx';
import ProspectDetail from './pages/ProspectDetail.jsx';
import CSVImport from './pages/CSVImport.jsx';
import CallerWorkspace from './pages/CallerWorkspace.jsx';
import Followups from './pages/Followups.jsx';
import Pipeline from './pages/Pipeline.jsx';
import ProposalBuilder from './pages/ProposalBuilder.jsx';
import Contracts from './pages/Contracts.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import ActivityLogs from './pages/ActivityLogs.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import RoleRoute from './routes/RoleRoute.jsx';

const ALL = ['admin', 'executive', 'manager', 'closer', 'finance', 'caller'];

function Shell({ roles = ALL, children }) {
  return (
    <RoleRoute roles={roles}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/prospects" element={<Shell><Prospects /></Shell>} />
      <Route path="/prospects/:id" element={<Shell><ProspectDetail /></Shell>} />
      <Route path="/csv-import" element={<Shell roles={['admin', 'manager', 'caller']}><CSVImport /></Shell>} />
      <Route path="/caller" element={<Shell><CallerWorkspace /></Shell>} />
      <Route path="/followups" element={<Shell><Followups /></Shell>} />
      <Route path="/pipeline" element={<Shell><Pipeline /></Shell>} />
      <Route path="/proposal-builder" element={<Shell><ProposalBuilder /></Shell>} />
      <Route path="/contracts" element={<Shell><Contracts /></Shell>} />
      <Route path="/payments" element={<Shell roles={['admin', 'executive', 'manager', 'finance']}><Payments /></Shell>} />
      <Route path="/reports" element={<Shell><Reports /></Shell>} />
      <Route path="/users" element={<Shell roles={['admin']}><Users /></Shell>} />
      <Route path="/settings" element={<Shell roles={['admin']}><Settings /></Shell>} />
      <Route path="/activity-logs" element={<Shell><ActivityLogs /></Shell>} />
    </Routes>
  );
}