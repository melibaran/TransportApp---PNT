import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Calculator, Save } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useEarnings } from '@/context/EarningsContext'
import { supabase } from '@/lib/supabase'

/**
 * Funcionalidades:
 * - Formulario de entrada de datos de ganancias
 * - Cálculo automático de métricas (por km, hora, viaje)
 * - Validación de campos obligatorios
 * - Guardado en base de datos
 * - Notificaciones de éxito/error
 * - Limpieza automática del formulario
 * - Diseño responsive y atractivo
 */
const EarningsScreen = () => {
  // Obtener usuario autenticado y función de refresco
  const { user } = useAuth()
  const { refreshHistory } = useEarnings()

  const [formData, setFormData] = useState({
    totalEarnings: '',
    tripsCompleted: '',
    kilometersDriver: '',
    hoursWorked: '',
    tips: '',
    extras: '',
    fuelCost: '',
    otherExpenses: '',
  });
  
  const [calculations, setCalculations] = useState({
    grossEarnings: 0,
    grossPerKm: 0,
    grossPerHour: 0,
    grossPerTrip: 0,
    totalExpenses: 0,
    netEarnings: 0,
    netPerKm: 0,
    netPerHour: 0,
    netPerTrip: 0,
  });
  

  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  /**
   * Efecto para recalcular métricas cuando cambian los datos del formulario
   */
  useEffect(() => {
    calculateValues()
  }, [formData])

  /**
   * Función para mostrar notificaciones temporales
   * @param {string} type - Tipo de notificación ('success' o 'error')
   * @param {string} message - Mensaje a mostrar
   */
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  /**
   * Función para calcular todas las métricas automáticamente
   * Se ejecuta cada vez que cambian los datos del formulario
   */
  const calculateValues = () => {
    const totalEarnings = parseFloat(formData.totalEarnings) || 0
    const tripsCompleted = parseFloat(formData.tripsCompleted) || 0
    const kilometersDriver = parseFloat(formData.kilometersDriver) || 0
    const hoursWorked = parseFloat(formData.hoursWorked) || 0
    const tips = parseFloat(formData.tips) || 0
    const extras = parseFloat(formData.extras) || 0
    const fuelCost = parseFloat(formData.fuelCost) || 0
    const otherExpenses = parseFloat(formData.otherExpenses) || 0

    const grossEarnings = totalEarnings + tips + extras
    const totalExpenses = fuelCost + otherExpenses
      const netEarnings = grossEarnings - totalExpenses

    // Actualizar estado con todos los cálculos
    setCalculations({
      grossEarnings,
      grossPerKm: kilometersDriver > 0 ? grossEarnings / kilometersDriver : 0,
      grossPerHour: hoursWorked > 0 ? grossEarnings / hoursWorked : 0,
      grossPerTrip: tripsCompleted > 0 ? grossEarnings / tripsCompleted : 0,
      totalExpenses,
      netEarnings,
      netPerKm: kilometersDriver > 0 ? netEarnings / kilometersDriver : 0,
      netPerHour: hoursWorked > 0 ? netEarnings / hoursWorked : 0,
      netPerTrip: tripsCompleted > 0 ? netEarnings / tripsCompleted : 0,
    })
  }

  /**
   * Función para manejar cambios en los inputs del formulario
   * @param {Event} e - Evento del input
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpiar notificación cuando el usuario empiece a escribir
    if (notification) setNotification(null)
  }

  /**
   * Función para guardar el registro en la base de datos
   */
  const handleSave = async () => {
    if (!user) return

    const requiredFields = ['totalEarnings', 'tripsCompleted', 'kilometersDriver', 'hoursWorked']
    const missingFields = requiredFields.filter(field => !formData[field])

    if (missingFields.length > 0) {
      showNotification('error', 'Por favor completa todos los campos obligatorios')
      return
    }

    setLoading(true)

    try {
      // Preparar datos para insertar en la base de datos
      const earningsData = {
        user_id: user.id,
        date: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
        total_earnings: parseFloat(formData.totalEarnings),
        trips_completed: parseInt(formData.tripsCompleted),
        kilometers_driven: parseFloat(formData.kilometersDriver),
        hours_worked: parseFloat(formData.hoursWorked),
        tips: parseFloat(formData.tips) || 0,
        extras: parseFloat(formData.extras) || 0,
        fuel_cost: parseFloat(formData.fuelCost) || 0,
        other_expenses: parseFloat(formData.otherExpenses) || 0,

        gross_earnings: calculations.grossEarnings,
        gross_per_km: calculations.grossPerKm,
        gross_per_hour: calculations.grossPerHour,
        gross_per_trip: calculations.grossPerTrip,
        total_expenses: calculations.totalExpenses,
        net_earnings: calculations.netEarnings,
        net_per_km: calculations.netPerKm,
        net_per_hour: calculations.netPerHour,
        net_per_trip: calculations.netPerTrip,
      }

      // Insertar en la base de datos
      const { error } = await supabase
        .from('earnings_records')
        .insert([earningsData])

      if (error) {
        throw error
      }

      // Mostrar mensaje de éxito
      showNotification('success', 'Registro guardado correctamente')
      
      // Limpiar formulario
      setFormData({
        totalEarnings: '',
        tripsCompleted: '',
        kilometersDriver: '',
        hoursWorked: '',
        tips: '',
        extras: '',
        fuelCost: '',
        otherExpenses: '',
      })

      // Refrescar historial en tiempo real
      refreshHistory()

    } catch (error) {
      console.error('Error guardando registro:', error)
      showNotification('error', 'No se pudo guardar el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header de la pantalla */}
      <div className="flex items-center justify-between mb-6 lg:mb-8 pb-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <DollarSign size={28} className="text-primary-500" />
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Registro de Ganancias</h1>
        </div>
      </div>

      {/* Notificación */}
      {notification && (
        <div className={`${notification.type === 'success' ? 'notification-success' : 'notification-error'} mb-6`}>
          <span>{notification.message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Sección de datos de entrada */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <DollarSign size={20} className="text-primary-500" />
            Datos de Entrada
          </h2>
          
          <div className="grid gap-4">
            {/* Ganancias Totales */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Ganancias Totales *
              </label>
              <input
                type="number"
                name="totalEarnings"
                value={formData.totalEarnings}
                onChange={handleInputChange}
                placeholder="0.00"
                className="input-field w-full"
                step="0.01"
                min="0"
              />
            </div>

            {/* Viajes Realizados */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Viajes Realizados *
              </label>
              <input
                type="number"
                name="tripsCompleted"
                value={formData.tripsCompleted}
                onChange={handleInputChange}
                placeholder="0"
                className="input-field w-full"
                min="0"
              />
            </div>

            {/* Kilómetros Recorridos */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Kilómetros Recorridos *
              </label>
              <input
                type="number"
                name="kilometersDriver"
                value={formData.kilometersDriver}
                onChange={handleInputChange}
                placeholder="0.0"
                className="input-field w-full"
                step="0.1"
                min="0"
              />
            </div>

            {/* Horas Trabajadas */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Horas Trabajadas *
              </label>
              <input
                type="number"
                name="hoursWorked"
                value={formData.hoursWorked}
                onChange={handleInputChange}
                placeholder="0.0"
                className="input-field w-full"
                step="0.1"
                min="0"
              />
            </div>

            {/* Propinas */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Propinas
              </label>
              <input
                type="number"
                name="tips"
                value={formData.tips}
                onChange={handleInputChange}
                placeholder="0.00"
                className="input-field w-full"
                step="0.01"
                min="0"
              />
            </div>

            {/* Extras */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Extras
              </label>
              <input
                type="number"
                name="extras"
                value={formData.extras}
                onChange={handleInputChange}
                placeholder="0.00"
                className="input-field w-full"
                step="0.01"
                min="0"
              />
            </div>

            {/* Gasto en Combustible */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Gasto en Combustible
              </label>
              <input
                type="number"
                name="fuelCost"
                value={formData.fuelCost}
                onChange={handleInputChange}
                placeholder="0.00"
                className="input-field w-full"
                step="0.01"
                min="0"
              />
            </div>

            {/* Gastos Varios */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Gastos Varios
              </label>
              <input
                type="number"
                name="otherExpenses"
                value={formData.otherExpenses}
                onChange={handleInputChange}
                placeholder="0.00"
                className="input-field w-full"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Sección de cálculos automáticos */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-success-500" />
              Cálculos Automáticos
            </h2>

            <div className="space-y-4">
              {/* Card de Ganancias Brutas */}
              <div className="bg-dark-700 rounded-lg p-4 border border-success-600/20">
                <h3 className="text-sm font-medium text-dark-300 mb-2">Ganancias Brutas</h3>
                <div className="text-2xl font-bold text-success-400 mb-3">
                  ${calculations.grossEarnings.toFixed(2)}
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs text-dark-400">
                  <span>Por km: ${calculations.grossPerKm.toFixed(2)}</span>
                  <span>Por hora: ${calculations.grossPerHour.toFixed(2)}</span>
                  <span>Por viaje: ${calculations.grossPerTrip.toFixed(2)}</span>
                </div>
              </div>

              {/* Card de Gastos Totales */}
              <div className="bg-dark-700 rounded-lg p-4 border border-danger-600/20">
                <h3 className="text-sm font-medium text-dark-300 mb-2">Gastos Totales</h3>
                <div className="text-2xl font-bold text-danger-400">
                  ${calculations.totalExpenses.toFixed(2)}
                </div>
              </div>

              {/* Card de Ganancias Netas */}
              <div className="bg-dark-700 rounded-lg p-4 border-2 border-primary-600">
                <h3 className="text-sm font-medium text-dark-300 mb-2">Ganancias Netas</h3>
                <div className="text-3xl font-bold text-primary-400 mb-3">
                  ${calculations.netEarnings.toFixed(2)}
                </div>
                <div className="grid grid-cols-1 gap-1 text-xs text-dark-400">
                  <span>Por km: ${calculations.netPerKm.toFixed(2)}</span>
                  <span>Por hora: ${calculations.netPerHour.toFixed(2)}</span>
                  <span>Por viaje: ${calculations.netPerTrip.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botón para guardar */}
            <button
              onClick={handleSave}
              disabled={loading}
              className={`btn-primary w-full mt-6 flex items-center justify-center gap-2 ${
                loading ? 'btn-disabled' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-5 h-5"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar Registro
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EarningsScreen