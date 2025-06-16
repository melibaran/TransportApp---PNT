import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Funcionalidades:
 * Verificación de autenticación
 * Redirección automática al login
 * Spinner de carga durante verificación
 * Protección de rutas sensibles
 */
const ProtectedRoute = ({ children }) => {
  // Obtener datos de autenticación del contexto
  const { user, loading } = useAuth()

  // Mostrar spinner mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          {/* Spinner de carga personalizado */}
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-dark-400 text-lg">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si hay usuario autenticado, mostrar el contenido protegido
  return children
}

export default ProtectedRoute