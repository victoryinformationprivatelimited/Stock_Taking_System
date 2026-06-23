import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { UploadPage } from './pages/UploadPage';
import { UsersPage } from './pages/UsersPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { LayoutsPage } from './pages/LayoutsPage';
import { LayoutEditorPage } from './pages/LayoutEditorPage';
import { ReportsPage } from './pages/ReportsPage';
import { LogsPage } from './pages/LogsPage';
import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/uploads" element={<UploadPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/layouts" element={<LayoutsPage />} />
            <Route path="/layouts/:id" element={<LayoutEditorPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
