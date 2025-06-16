import React, { createContext, useContext, useState, useCallback } from 'react'

const EarningsContext = createContext({})

export const useEarnings = () => {
  const context = useContext(EarningsContext)
  if (!context) {
    throw new Error('useEarnings debe ser usado dentro de un EarningsProvider')
  }
  return context
}

export const EarningsProvider = ({ children }) => {
  const [refreshHistoryCallback, setRefreshHistoryCallback] = useState(null)

  const refreshHistory = useCallback(() => {
    if (refreshHistoryCallback) {
      console.log('Refrescando historial de ganancias...')
      refreshHistoryCallback()
    }
  }, [refreshHistoryCallback])

  const setRefreshHistory = useCallback((callback) => {
    setRefreshHistoryCallback(() => callback)
  }, [])

  const value = {
    refreshHistory,
    setRefreshHistory,
  }

  return (
    <EarningsContext.Provider value={value}>
      {children}
    </EarningsContext.Provider>
  )
}
