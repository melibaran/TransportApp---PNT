import React, { useState } from 'react';
import { Route, MapPin, DollarSign, TrendingUp, TrendingDown, Minus, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

/**
 * Esta pantalla permite a los usuarios:
 * Ingresar direcciones de origen y destino con autocompletado
 * Calcular la distancia real usando la API de Mapbox
 * Analizar la rentabilidad basada en precio por kilómetro
 * Guardar análisis para referencia futura
 * Ver clasificación automática de rentabilidad
 */
const TripsScreen = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    origin: '',             
    destination: '',           
    desiredPricePerKm: '',       
    tripPrice: '',               
  });

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]); 
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false); 

  const [originCoords, setOriginCoords] = useState(null); 
  const [destinationCoords, setDestinationCoords] = useState(null); 

  const [analysis, setAnalysis] = useState(null); 

  const [loading, setLoading] = useState(false); 
  const [notification, setNotification] = useState(null); 
  const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiNDI4OTk3NDciLCJhIjoiY21iNm5qOGZ0MDFubDJycGxyaW03MTN0YSJ9.KiujcKaRF9ED2we6H3-GAw';

  /**
   * Función para mostrar notificaciones al usuario
   * 
   * @param {string} type 
   * @param {string} message 
   */
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  /**
   * Función para buscar sugerencias de direcciones usando la API de Mapbox
   * 
   * Esta función convierte texto en direcciones
   * válidas con coordenadas geográficas
   * 
   * @param {string} query 
   * @param {boolean} isOrigin 
   */
  const fetchSuggestions = async (query, isOrigin) => {
    if (query.length < 3) {
      if (isOrigin) {
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
      } else {
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
      return;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: MAPBOX_ACCESS_TOKEN,
            country: 'ar', 
            limit: 5,     
          },
        }
      );

      const suggestions = response.data.features || [];
      
      if (isOrigin) {
        setOriginSuggestions(suggestions);
        setShowOriginSuggestions(true);
      } else {
        setDestinationSuggestions(suggestions);
        setShowDestinationSuggestions(true);
      }
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
    }
  };

  /**
   * Función para seleccionar una sugerencia de dirección
   * 
   * Cuando el usuario hace clic en una sugerencia, esta función:
   * Actualiza el campo de texto con la dirección completa
   * Guarda las coordenadas para cálculos posteriores
   * Oculta la lista de sugerencias
   * 
   * @param {Object} suggestion 
   * @param {boolean} isOrigin 
   */
  const selectSuggestion = (suggestion, isOrigin) => {
    if (isOrigin) {
      setFormData(prev => ({ ...prev, origin: suggestion.place_name }));
      setOriginCoords(suggestion.geometry.coordinates);
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    } else {
      setFormData(prev => ({ ...prev, destination: suggestion.place_name }));
      setDestinationCoords(suggestion.geometry.coordinates);
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
    }
  };

  /**
   * Función para manejar cambios en los inputs del formulario
   * 
   * @param {Event} e 
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'origin') {
      fetchSuggestions(value, true);
    } else if (name === 'destination') {
      fetchSuggestions(value, false);
    }
    
    if (notification) setNotification(null);
  };

  /**
   * Función principal para calcular la rentabilidad del viaje
   * 
   * Esta función:
   * Valida que se hayan seleccionado direcciones válidas, calcula la ruta real usando Mapbox Directions API
   * Analiza la rentabilidad comparando precios, clasifica el viaje como rentable, poco rentable o no rentable
   */
  const calculateProfitability = async () => {
    if (!originCoords || !destinationCoords) {
      showNotification('error', 'Por favor selecciona origen y destino válidos de las sugerencias');
      return;
    }

    if (!formData.desiredPricePerKm || !formData.tripPrice) {
      showNotification('error', 'Por favor completa el precio deseado por km y el precio del viaje');
      return;
    }

    const tripPrice = parseFloat(formData.tripPrice);
    const desiredPricePerKm = parseFloat(formData.desiredPricePerKm);

    if (isNaN(tripPrice) || tripPrice <= 0 || isNaN(desiredPricePerKm) || desiredPricePerKm <= 0) {
      showNotification('error', 'Por favor ingresa precios válidos');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destinationCoords[0]},${destinationCoords[1]}`,
        {
          params: {
            access_token: MAPBOX_ACCESS_TOKEN,
            geometries: 'geojson',
            overview: 'full',
          },
        }
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        showNotification('error', 'No se pudo calcular la ruta entre los puntos seleccionados');
        return;
      }

      const route = response.data.routes[0];
      const distanceKm = route.distance / 1000; 
      const actualPricePerKm = tripPrice / distanceKm;
      const difference = ((actualPricePerKm - desiredPricePerKm) / desiredPricePerKm) * 100;

      // Determinar rentabilidad basada en la diferencia porcentual
      let profitability;
      if (difference >= 10) {
        profitability = 'rentable';  
        // Más del 10% por encima del precio deseado
      } else if (difference >= -10) {
        profitability = 'poco_rentable';   
        // Entre -10% y +10% del precio deseado
      } else {
        profitability = 'no_rentable';     
        // Más del 10% por debajo del precio deseado
      }

      // Actualizar estado con el análisis completo
      setAnalysis({
        distance: distanceKm,
        actualPricePerKm,
        profitability,
        difference,
      });

    } catch (error) {
      console.error('Error calculando ruta:', error);
      showNotification('error', 'Error al calcular la ruta. Verifica tu conexión a internet');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para guardar el análisis en la base de datos
   * 
   * Guarda todos los datos del análisis en Supabase para referencia futura
   */
  const handleSave = async () => {
    if (!user || !analysis) return;

    setLoading(true);

    try {
      // Preparar datos para insertar en la base de datos
      const tripData = {
        user_id: user.id,
        origin: formData.origin,
        destination: formData.destination,
        distance_km: analysis.distance,
        trip_price: parseFloat(formData.tripPrice),
        desired_price_per_km: parseFloat(formData.desiredPricePerKm),
        actual_price_per_km: analysis.actualPricePerKm,
        profitability: analysis.profitability,
      };

      // Insertar en la base de datos
      const { error } = await supabase
        .from('trip_analysis')
        .insert([tripData]);

      if (error) {
        throw error;
      }

      showNotification('success', 'Análisis guardado correctamente');
      
      // Limpiar formulario después de guardar 
      setFormData({
        origin: '',
        destination: '',
        desiredPricePerKm: '',
        tripPrice: '',
      });
      setOriginCoords(null);
      setDestinationCoords(null);
      setAnalysis(null);

    } catch (error) {
      console.error('Error guardando análisis:', error);
      showNotification('error', 'No se pudo guardar el análisis');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Funciones helper 
   */
  
  // Obtener color según el tipo de rentabilidad
  const getProfitabilityColor = (profitability) => {
    switch (profitability) {
      case 'rentable': return 'text-green-400 border-green-400';
      case 'poco_rentable': return 'text-yellow-400 border-yellow-400';
      case 'no_rentable': return 'text-red-400 border-red-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  // Obtener icono según el tipo de rentabilidad
  const getProfitabilityIcon = (profitability) => {
    switch (profitability) {
      case 'rentable': return <TrendingUp size={24} className="text-green-400" />;
      case 'poco_rentable': return <Minus size={24} className="text-yellow-400" />;
      case 'no_rentable': return <TrendingDown size={24} className="text-red-400" />;
      default: return null;
    }
  };

  // Obtener etiqueta según el tipo de rentabilidad
  const getProfitabilityLabel = (profitability) => {
    switch (profitability) {
      case 'rentable': return 'RENTABLE';
      case 'poco_rentable': return 'POCO RENTABLE';
      case 'no_rentable': return 'NO RENTABLE';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <div className="bg-dark-800 border-b border-dark-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Route size={32} className="text-primary-500" />
          <h1 className="text-3xl font-bold">Rentabilidad de Viajes</h1>
        </div>
      </div>

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
        {/* Formulario de datos del viaje */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 flex items-center space-x-2">
            <MapPin size={24} className="text-primary-500" />
            <span>Datos del Viaje</span>
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Campo de origen con sugerencias */}
            <div className="relative">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Dirección de origen
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  placeholder="Ingresa la dirección de origen"
                  className="input-field pl-10 w-full"
                  onFocus={() => {
                    if (originSuggestions.length > 0) {
                      setShowOriginSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Retrasar el ocultado para permitir selección
                    setTimeout(() => setShowOriginSuggestions(false), 200);
                  }}
                />
              </div>
              
              {/* Lista de sugerencias de origen */}
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-dark-800 border border-dark-600 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {originSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center space-x-3 p-3 hover:bg-dark-700 cursor-pointer transition-colors duration-200"
                      onClick={() => selectSuggestion(suggestion, true)}
                    >
                      <MapPin size={16} className="text-dark-400 flex-shrink-0" />
                      <span className="text-sm text-white">{suggestion.place_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campo de destino con sugerencias */}
            <div className="relative">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Dirección de destino
              </label>
              <div className="relative">
                <Navigation size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  placeholder="Ingresa la dirección de destino"
                  className="input-field pl-10 w-full"
                  onFocus={() => {
                    if (destinationSuggestions.length > 0) {
                      setShowDestinationSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowDestinationSuggestions(false), 200);
                  }}
                />
              </div>
              
              {/* Lista de sugerencias de destino */}
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-dark-800 border border-dark-600 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {destinationSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center space-x-3 p-3 hover:bg-dark-700 cursor-pointer transition-colors duration-200"
                      onClick={() => selectSuggestion(suggestion, false)}
                    >
                      <MapPin size={16} className="text-dark-400 flex-shrink-0" />
                      <span className="text-sm text-white">{suggestion.place_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Precio deseado por km */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Precio por km deseado (ARS)
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="number"
                  name="desiredPricePerKm"
                  value={formData.desiredPricePerKm}
                  onChange={handleInputChange}
                  placeholder="750.00"
                  className="input-field pl-10 w-full"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Precio total del viaje */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Precio del viaje (ARS)
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="number"
                  name="tripPrice"
                  value={formData.tripPrice}
                  onChange={handleInputChange}
                  placeholder="5000.00"
                  className="input-field pl-10 w-full"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Botón para calcular */}
          <button
            onClick={calculateProfitability}
            disabled={loading}
            className={`btn-primary w-full mt-6 flex items-center justify-center space-x-2 ${
              loading ? 'btn-disabled' : ''
            }`}
          >
            {loading && <div className="loading-spinner w-5 h-5"></div>}
            <span>{loading ? 'Calculando ruta...' : 'Calcular Rentabilidad'}</span>
          </button>
        </div>

        {/* Resultados del análisis */}
        {analysis && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Análisis de Rentabilidad</h2>
            
            <div className={`border-2 rounded-xl p-6 ${getProfitabilityColor(analysis.profitability)}`}>
              {/* Header del análisis con icono y etiqueta */}
              <div className="flex items-center space-x-3 mb-6">
                {getProfitabilityIcon(analysis.profitability)}
                <span className={`text-2xl font-bold ${getProfitabilityColor(analysis.profitability).split(' ')[0]}`}>
                  {getProfitabilityLabel(analysis.profitability)}
                </span>
              </div>

              {/* Detalles del análisis en grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-dark-800 rounded-lg p-4">
                  <span className="block text-sm text-dark-400 mb-1">Distancia calculada</span>
                  <span className="text-xl font-bold">{analysis.distance.toFixed(2)} km</span>
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <span className="block text-sm text-dark-400 mb-1">Precio real por km</span>
                  <span className="text-xl font-bold">${analysis.actualPricePerKm.toFixed(2)}</span>
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <span className="block text-sm text-dark-400 mb-1">Precio deseado por km</span>
                  <span className="text-xl font-bold">${parseFloat(formData.desiredPricePerKm).toFixed(2)}</span>
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <span className="block text-sm text-dark-400 mb-1">Diferencia</span>
                  <span className={`text-xl font-bold ${analysis.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analysis.difference > 0 ? '+' : ''}{analysis.difference.toFixed(1)}%
                  </span>
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <span className="block text-sm text-dark-400 mb-1">Precio total</span>
                  <span className="text-xl font-bold">${parseFloat(formData.tripPrice).toFixed(2)}</span>
                </div>
              </div>

              {/* Botón para guardar análisis */}
              <button
                onClick={handleSave}
                disabled={loading}
                className={`btn-success w-full flex items-center justify-center space-x-2 ${
                  loading ? 'btn-disabled' : ''
                }`}
              >
                {loading && <div className="loading-spinner w-5 h-5"></div>}
                <span>{loading ? 'Guardando...' : 'Guardar Análisis'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Información del mapa */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 flex items-center space-x-2">
            <MapPin size={24} className="text-primary-500" />
            <span>Mapa del Viaje</span>
          </h2>
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-12 text-center">
            <MapPin size={64} className="mx-auto text-dark-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mapa del viaje</h3>
            <p className="text-dark-400 mb-2">
              {analysis ? 
                `Ruta calculada: ${analysis.distance.toFixed(2)} km` : 
                'Calcula una ruta para ver la información del viaje'
              }
            </p>
            <p className="text-sm text-dark-500">
              El mapa interactivo estará disponible en futuras versiones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripsScreen;