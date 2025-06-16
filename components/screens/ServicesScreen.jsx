import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Gauge, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Pantalla de Registro de Servicios del Vehículo
 * 
 * Esta pantalla permite a los usuarios:
 * - Registrar servicios realizados al vehículo
 * - Hacer seguimiento de próximos servicios
 * - Recibir recordatorios basados en fecha o kilometraje
 * - Gestionar diferentes tipos de servicios (VTV, aceite, frenos, etc.)
 * 
 * Funcionalidades principales:
 * - Formulario de registro de servicios
 * - Cálculo automático de próximos servicios
 * - Lista de servicios programados
 * - Alertas de servicios próximos a vencer
 * - Interfaz responsive con Tailwind CSS
 */
const ServicesScreen = () => {
  // Obtener usuario autenticado del contexto
  const { user } = useAuth();

  // Estados del formulario de registro
  const [currentMileage, setCurrentMileage] = useState(''); // Kilometraje actual del vehículo
  const [selectedServices, setSelectedServices] = useState([]); // Servicios seleccionados para registrar

  // Estados de datos
  const [upcomingServices, setUpcomingServices] = useState([]); // Lista de servicios programados

  // Estados de UI
  const [loading, setLoading] = useState(false); // Estado de carga para operaciones async
  const [notification, setNotification] = useState(null); // Notificación temporal

  /**
   * Configuración de tipos de servicios disponibles
   * 
   * Cada servicio tiene reglas diferentes para calcular el próximo mantenimiento:
   * - rule: 'years' para servicios basados en tiempo
   * - rule: 'km' para servicios basados en kilometraje
   * - value: cantidad de años o kilómetros para el próximo servicio
   */
  const SERVICE_TYPES = [
    { 
      key: 'vtv', 
      label: 'VTV (Verificación Técnica Vehicular)', 
      rule: 'years',  // Se renueva cada cierto tiempo
      value: 2,       // Cada 2 años
      icon: CheckCircle,
      color: 'text-blue-500',
      description: 'Inspección técnica obligatoria del vehículo'
    },
    { 
      key: 'oil_change', 
      label: 'Cambio de aceite y filtros', 
      rule: 'km',     // Se cambia cada ciertos kilómetros
      value: 10000,   // Cada 10,000 km
      icon: Gauge,
      color: 'text-green-500',
      description: 'Mantenimiento del motor y sistema de lubricación'
    },
    { 
      key: 'timing_belt', 
      label: 'Cambio de correa de distribución', 
      rule: 'km', 
      value: 70000,   // Cada 70,000 km
      icon: Settings,
      color: 'text-orange-500',
      description: 'Componente crítico del motor'
    },
    { 
      key: 'brakes', 
      label: 'Cambio de pastillas de freno', 
      rule: 'km', 
      value: 40000,   // Cada 40,000 km
      icon: AlertCircle,
      color: 'text-red-500',
      description: 'Sistema de seguridad del vehículo'
    },
  ];

  /**
   * Efecto para cargar servicios registrados al montar el componente
   */
  useEffect(() => {
    if (user) {
      loadUpcomingServices();
    }
  }, [user]);

  /**
   * Función para mostrar notificaciones temporales
   * 
   * @param {string} type - Tipo de notificación ('success' o 'error')
   * @param {string} message - Mensaje a mostrar
   */
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  /**
   * Función para cargar servicios desde la base de datos
   * 
   * Obtiene todos los servicios registrados por el usuario
   * ordenados por fecha de creación (más recientes primero)
   */
  const loadUpcomingServices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('service_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUpcomingServices(data || []);
    } catch (error) {
      console.error('Error cargando servicios:', error);
      showNotification('error', 'Error al cargar los servicios');
    }
  };

  /**
   * Función para alternar la selección de servicios en el formulario
   * 
   * @param {string} serviceKey - Clave del servicio a alternar
   */
  const toggleService = (serviceKey) => {
    setSelectedServices(prev => 
      prev.includes(serviceKey)
        ? prev.filter(s => s !== serviceKey)  // Quitar si ya está seleccionado
        : [...prev, serviceKey]               // Agregar si no está seleccionado
    );
  };

  /**
   * Función para calcular el próximo servicio basado en las reglas
   * 
   * @param {string} serviceType - Tipo de servicio
   * @param {number} currentMileage - Kilometraje actual
   * @param {string} serviceDate - Fecha del servicio actual
   * @returns {Object} - Objeto con la fecha o kilometraje del próximo servicio
   */
  const calculateNextService = (serviceType, currentMileage, serviceDate) => {
    const service = SERVICE_TYPES.find(s => s.key === serviceType);
    if (!service) return {};

    if (service.rule === 'years') {
      // Para servicios basados en tiempo (como VTV)
      const nextDate = new Date(serviceDate);
      nextDate.setFullYear(nextDate.getFullYear() + service.value);
      return { next_service_date: nextDate.toISOString().split('T')[0] };
    } else {
      // Para servicios basados en kilometraje
      return { next_service_mileage: currentMileage + service.value };
    }
  };

  /**
   * Función para guardar los servicios seleccionados en la base de datos
   * 
   * Para cada servicio seleccionado:
   * 1. Calcula el próximo servicio
   * 2. Verifica si ya existe un registro
   * 3. Actualiza o crea el registro según corresponda
   */
  const handleSave = async () => {
    // Validaciones previas
    if (!user || !currentMileage || selectedServices.length === 0) {
      showNotification('error', 'Por favor completa el kilometraje y selecciona al menos un servicio');
      return;
    }

    setLoading(true);

    const mileage = parseFloat(currentMileage);
    const currentDate = new Date().toISOString().split('T')[0];

    try {
      // Procesar cada servicio seleccionado
      for (const serviceType of selectedServices) {
        const nextService = calculateNextService(serviceType, mileage, currentDate);
        
        // Verificar si ya existe un registro para este tipo de servicio
        const { data: existingService } = await supabase
          .from('service_records')
          .select('id')
          .eq('user_id', user.id)
          .eq('service_type', serviceType)
          .limit(1);

        const serviceData = {
          user_id: user.id,
          service_type: serviceType,
          service_date: currentDate,
          current_mileage: mileage,
          ...nextService,
        };

        if (existingService && existingService.length > 0) {
          // Actualizar registro existente
          const { error } = await supabase
            .from('service_records')
            .update(serviceData)
            .eq('id', existingService[0].id);

          if (error) throw error;
        } else {
          // Crear nuevo registro
          const { error } = await supabase
            .from('service_records')
            .insert([serviceData]);

          if (error) throw error;
        }
      }

      showNotification('success', 'Servicios registrados correctamente');
      
      // Limpiar formulario
      setCurrentMileage('');
      setSelectedServices([]);
      
      // Recargar servicios
      loadUpcomingServices();

    } catch (error) {
      console.error('Error guardando servicios:', error);
      showNotification('error', 'No se pudieron guardar los servicios');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para eliminar un servicio de la base de datos
   * 
   * @param {string} serviceId - ID del servicio a eliminar
   */
  const deleteService = async (serviceId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_records')
        .delete()
        .eq('id', serviceId);

      if (error) {
        throw error;
      }

      showNotification('success', 'Servicio eliminado correctamente');
      loadUpcomingServices();
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      showNotification('error', 'No se pudo eliminar el servicio');
    }
  };

  /**
   * Función para verificar si un servicio está próximo a vencer
   * 
   * @param {Object} service - Registro de servicio
   * @returns {boolean} - True si está próximo a vencer
   */
  const isServiceDue = (service) => {
    const today = new Date();
    
    if (service.next_service_date) {
      // Para servicios basados en fecha
      const nextServiceDate = new Date(service.next_service_date);
      const daysUntilService = Math.ceil((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilService <= 30; // Próximo si faltan 30 días o menos
    }
    
    if (service.next_service_mileage && currentMileage) {
      // Para servicios basados en kilometraje
      const currentKm = parseFloat(currentMileage);
      return currentKm >= (service.next_service_mileage - 1000); // Próximo si faltan 1000 km o menos
    }
    
    return false;
  };

  /**
   * Función para obtener el componente de icono de un tipo de servicio
   * 
   * @param {string} serviceType - Tipo de servicio
   * @returns {JSX.Element} - Componente de icono
   */
  const getServiceIcon = (serviceType) => {
    const service = SERVICE_TYPES.find(s => s.key === serviceType);
    if (!service) return <Settings size={20} className="text-gray-400" />;
    
    const IconComponent = service.icon;
    return <IconComponent size={20} className={service.color} />;
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header de la pantalla */}
      <div className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Settings size={32} className="text-primary-500" />
          <h1 className="text-3xl font-bold">Registro de Servicios</h1>
        </div>
      </div>

      {/* Notificación temporal */}
      {notification && (
        <div className={`${notification.type === 'success' ? 'notification-success' : 'notification-error'} fixed top-4 right-4 z-50`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* Formulario de nuevo registro */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 flex items-center space-x-2">
            <Gauge size={24} className="text-success-500" />
            <span>Nuevo Registro</span>
          </h2>
          
          {/* Campo de kilometraje actual */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Kilometraje Actual del Vehículo
            </label>
            <div className="relative">
              <Gauge size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
              <input
                type="number"
                value={currentMileage}
                onChange={(e) => {
                  setCurrentMileage(e.target.value);
                  if (notification) setNotification(null);
                }}
                placeholder="120,000"
                className="input-field pl-10 w-full"
                min="0"
              />
            </div>
            <p className="text-xs text-dark-400 mt-1">
              Ingresa el kilometraje actual para calcular próximos servicios
            </p>
          </div>

          {/* Selección de servicios realizados */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark-300 mb-4">
              Servicios Realizados Hoy
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {SERVICE_TYPES.map(service => {
                const IconComponent = service.icon;
                const isSelected = selectedServices.includes(service.key);
                
                return (
                  <div
                    key={service.key}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-900/20' 
                        : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                    }`}
                    onClick={() => toggleService(service.key)}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent size={24} className={service.color} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{service.label}</h3>
                        <p className="text-xs text-dark-400 mb-2">{service.description}</p>
                        <p className="text-xs text-dark-500">
                          Repetir cada {service.value} {service.rule === 'years' ? 'años' : 'km'}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-500' 
                          : 'border-dark-500'
                      }`}>
                        {isSelected && <CheckCircle size={16} className="text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón para guardar */}
          <button
            onClick={handleSave}
            disabled={loading}
            className={`btn-primary w-full flex items-center justify-center space-x-2 ${
              loading ? 'btn-disabled' : ''
            }`}
          >
            {loading && <div className="loading-spinner w-5 h-5"></div>}
            <span>{loading ? 'Guardando...' : 'Registrar Servicios'}</span>
          </button>
        </div>

        {/* Lista de próximos servicios */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 flex items-center space-x-2">
            <Calendar size={24} className="text-primary-500" />
            <span>Próximos Servicios</span>
          </h2>
          
          {upcomingServices.length === 0 ? (
            // Estado vacío
            <div className="text-center py-12">
              <Calendar size={64} className="mx-auto text-dark-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay servicios registrados</h3>
              <p className="text-dark-400">
                Registra servicios para recibir recordatorios automáticos
              </p>
            </div>
          ) : (
            // Lista de servicios
            <div className="grid lg:grid-cols-2 gap-6">
              {upcomingServices.map(service => {
                const serviceType = SERVICE_TYPES.find(s => s.key === service.service_type);
                const isDue = isServiceDue(service);
                
                return (
                  <div
                    key={service.id}
                    className={`border-2 rounded-lg p-6 transition-all duration-200 ${
                      isDue 
                        ? 'border-yellow-500 bg-yellow-900/20' 
                        : 'border-dark-600 bg-dark-800'
                    }`}
                  >
                    {/* Header del servicio */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getServiceIcon(service.service_type)}
                        <div>
                          <h3 className="font-semibold text-white">{serviceType?.label}</h3>
                          {isDue && (
                            <span className="inline-block bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded mt-1">
                              PRÓXIMO A VENCER
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Detalles del servicio */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-dark-400">Último servicio:</span>
                        <span className="font-semibold">
                          {new Date(service.service_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Kilometraje:</span>
                        <span className="font-semibold">
                          {service.current_mileage.toLocaleString()} km
                        </span>
                      </div>
                      {service.next_service_date && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Próximo servicio:</span>
                          <span className="font-semibold">
                            {new Date(service.next_service_date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      )}
                      {service.next_service_mileage && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Próximo en:</span>
                          <span className="font-semibold">
                            {service.next_service_mileage.toLocaleString()} km
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesScreen;