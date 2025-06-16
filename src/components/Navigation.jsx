import React from 'react'
import { NavLink } from 'react-router-dom'
import { DollarSign, History, Route, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/**
 * Funcionalidades:
 * Navegación entre secciones principales
 * Indicador visual de sección activa
 * Información del usuario logueado
 * Botón de cerrar sesión en header móvil
 * Diseño responsive automático
 */
const Navigation = () => {
  // Obtener función de logout del contexto de autenticación
  const { signOut, user } = useAuth()

  /**
   * Función para manejar el cierre de sesión
   */
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Configuración de los elementos de navegación principales
  const navigationItems = [
    {
      to: '/dashboard',
      icon: DollarSign,
      label: 'Ganancias',
      end: true, // Coincidencia exacta para la ruta
    },
    {
      to: '/dashboard/history',
      icon: History,
      label: 'Historial',
    },
    {
      to: '/dashboard/trips',
      icon: Route,
      label: 'Viajes',
    },
    {
      to: '/dashboard/services',
      icon: Settings,
      label: 'Servicios',
    },
  ]

  return (
    <>
      {/* Navegación lateral para desktop (oculta en móvil) */}
      <nav className="hidden lg:flex w-80 h-screen bg-dark-800 border-r border-dark-700 flex-col fixed left-0 top-0 z-50">
        {/* Header de la navegación con información del usuario */}
        <div className="p-6 border-b border-dark-700">
          {/* Logo y título de la aplicación */}
          <div className="flex items-center gap-3 mb-4">
            <DollarSign size={28} className="text-primary-500" />
            <span className="text-xl font-bold text-white">TransportApp</span>
          </div>
          
          {/* Información del usuario si está logueado */}
          {user && (
            <div className="bg-dark-700 rounded-lg p-3">
              <span className="text-sm text-dark-300 break-all">{user.email}</span>
            </div>
          )}
        </div>

        {/* Lista de elementos de navegación */}
        <div className="flex-1 py-6 overflow-y-auto scrollbar-custom">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-6 py-3 text-dark-400 hover:text-white hover:bg-dark-700 transition-all duration-200 ${
                    isActive ? 'text-white bg-primary-600 border-r-4 border-primary-400' : ''
                  }`
                }
              >
                <IconComponent size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            )
          })}
        </div>

        {/* Botón de cerrar sesión en desktop */}
        <div className="p-6 border-t border-dark-700">
          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-3 w-full px-4 py-3 text-danger-400 hover:text-danger-300 hover:bg-danger-900/20 rounded-lg transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* Header móvil con información del usuario y logout (solo visible en móvil) */}
      <div className="lg:hidden bg-dark-800 border-b border-dark-700 px-4 py-3 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between">
          {/* Logo y título */}
          <div className="flex items-center gap-2">
            <DollarSign size={24} className="text-primary-500" />
            <span className="text-lg font-bold text-white">TransportApp</span>
          </div>
          
          {/* Sección derecha con email y botón de logout */}
          <div className="flex items-center gap-3">
            {/* Email del usuario */}
            {user && (
              <div className="text-right">
                <span className="text-xs text-dark-300 truncate max-w-32 block">
                  {user.email}
                </span>
              </div>
            )}
            
            {/* Botón de cerrar sesión */}
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1 px-3 py-2 text-danger-400 hover:text-danger-300 hover:bg-danger-900/20 rounded-lg transition-all duration-200"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navbar inferior para móvil (oculto en desktop) - Solo navegación */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50">
        <div className="flex items-center justify-around py-2">
          {/* Solo elementos de navegación principales */}
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 
                  `flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 transition-all duration-200 ${
                    isActive 
                      ? 'text-primary-400' 
                      : 'text-dark-400 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <IconComponent size={20} className="mb-1" />
                    <span className="text-xs font-medium truncate">{item.label}</span>
                    {/* Indicador visual para elemento activo */}
                    <div className={`w-1 h-1 rounded-full mt-1 transition-all duration-200 ${
                      isActive ? 'bg-primary-400' : 'bg-transparent'
                    }`} />
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default Navigation