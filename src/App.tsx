import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ReviewResource from './pages/ReviewResource'
import { DashboardProtectedRoute } from './components/DashboardProtectedRoute'

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

            <Route 
              path="/dashboard" 
              element={
                <DashboardProtectedRoute>
                  <Dashboard />
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
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
