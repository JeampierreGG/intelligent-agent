import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Resources from './pages/Resources'
import Ranking from './pages/Ranking'
import ReviewResource from './pages/ReviewResource'
import { DashboardProtectedRoute } from './components/DashboardProtectedRoute'
  import Progress from './pages/Progress'
  import PlayResource from './pages/PlayResource'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

// Componente para rutas públicas (solo accesibles si no está logueado)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div>Cargando...</div>
  }
  
  // Si el usuario está logueado, redirigir al dashboard
  // El DashboardProtectedRoute se encargará de verificar el cuestionario
  return !user ? <>{children}</> : <Navigate to="/dashboard" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />

          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

            <Route 
              path="/dashboard" 
              element={
                <DashboardProtectedRoute>
                  <Dashboard />
                </DashboardProtectedRoute>
              } 
            />
            <Route 
              path="/recursos" 
              element={
                <DashboardProtectedRoute>
                  <Resources />
                </DashboardProtectedRoute>
              } 
            />
            <Route 
              path="/ranking" 
              element={
                <DashboardProtectedRoute>
                  <Ranking />
                </DashboardProtectedRoute>
              } 
            />
            <Route 
              path="/progreso" 
              element={
                <DashboardProtectedRoute>
                  <Progress />
                </DashboardProtectedRoute>
              } 
            />
          <Route 
            path="/review/:resourceId" 
            element={
              <DashboardProtectedRoute>
                <ReviewResource />
              </DashboardProtectedRoute>
            } 
          />
          <Route 
            path="/play/:resourceId" 
            element={
              <DashboardProtectedRoute>
                <PlayResource />
              </DashboardProtectedRoute>
            } 
          />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
