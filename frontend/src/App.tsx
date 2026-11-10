import type React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import { AuthForm } from "./components/auth/AuthForm"
import { Layout } from "./components/layout/Layout"
import { Dashboard } from "./pages/Dashboard"
import { GroupList } from "./pages/GroupList"
import { ProjectList } from "./pages/ProjectList"
import  RecordList from "./pages/RecordList"
import { UserManagement } from "./pages/UserManagement"
import { AuditLog } from "./pages/AuditLog"
import { Statistics } from "./pages/Statistics"
import { GroupForm } from "./pages/GroupForm"
import { ProjectForm } from "./pages/ProjectForm"
import { RecordForm } from "./pages/RecordForm"
import { AssistantChat } from "./pages/AssistantChat"
import { ToastProvider } from "./contexts/ToastContext"

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <Routes>
        <Route path="/login" element={<AuthForm />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="groups" element={<GroupList />} />
          <Route path="groups/new" element={<GroupForm />} />
          <Route path="groups/:id/edit" element={<GroupForm />} />
          <Route path="groups/:id" element={<GroupForm />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/new" element={<ProjectForm />} />
          <Route path="projects/:id/edit" element={<ProjectForm />} />
          <Route path="projects/:id" element={<ProjectForm />} />
          <Route path="records" element={<RecordList />} />
          <Route path="records/new" element={<RecordForm />} />
          <Route path="records/:id/edit" element={<RecordForm />} />
          <Route path="records/:id" element={<RecordForm />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="assistant" element={<AssistantChat />} />
        </Route>
      </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
