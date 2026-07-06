import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import SuperAdminLayout from './components/layouts/SuperAdminLayout';
import SchoolAdminLayout from './components/layouts/SchoolAdminLayout';
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SchoolsList from './pages/super-admin/SchoolsList';
import SchoolAdminDashboard from './pages/school-admin/Dashboard';
import StudentsList from './pages/school-admin/StudentsList';
import TeachersList from './pages/school-admin/TeachersList';
import ClassesList from './pages/school-admin/ClassesList';
import FeeManagement from './pages/school-admin/FeeManagement';
import SchoolAdminSettings from './pages/school-admin/Settings';
import WhatsAppButton from './components/WhatsAppButton';
import Subjects from './pages/school-admin/Subjects';
import TeacherAssignments from './pages/school-admin/TeacherAssignments';
import MarksMonitoring from './pages/school-admin/MarksMonitoring';
import Promotions from './pages/school-admin/Promotions';
import Documents from './pages/school-admin/Documents';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { role, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-on-surface">Loading CampusDesk...</div>;
  }
  
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-6">
        <span className="text-2xl">🚧</span>
      </div>
      <h1 className="font-display-lg text-3xl font-bold text-on-surface mb-2">{title}</h1>
      <p className="text-on-surface-variant max-w-md">This module is currently under active development and will be available in the upcoming Phase 2 release.</p>
    </div>
  );
}

function AppRoutes() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-on-surface">Loading CampusDesk...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={
        role === 'super_admin' ? <Navigate to="/super-admin/dashboard" /> :
        role === 'school_admin' ? <Navigate to="/school-admin/dashboard" /> :
        <Login />
      } />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="schools" element={<SchoolsList />} />
        <Route path="reports" element={<PlaceholderPage title="System Reports" />} />
        <Route path="settings" element={<PlaceholderPage title="Global Settings" />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* School Admin Routes */}
      <Route path="/school-admin" element={
        <ProtectedRoute allowedRoles={['school_admin']}>
          <SchoolAdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<SchoolAdminDashboard />} />
        <Route path="students" element={<StudentsList />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="teachers" element={<TeachersList />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="marks" element={<MarksMonitoring />} />
        <Route path="classes" element={<ClassesList />} />
        <Route path="documents" element={<Documents />} />
        <Route path="attendance" element={<PlaceholderPage title="Attendance Tracking" />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="settings" element={<SchoolAdminSettings />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <AppRoutes />
        <WhatsAppButton />
      </Router>
    </AuthProvider>
  );
}
