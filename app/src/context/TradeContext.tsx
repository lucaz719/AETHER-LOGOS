'use client'

import { createContext, useCallback, useContext, useState } from 'react'

const TradeContext = createContext<{
  refreshKey: number
  triggerRefresh: () => void
}>({ refreshKey: 0, triggerRefresh: () => {} })

export function TradeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return (
    <TradeContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </TradeContext.Provider>
  )
}

export const useTradeSync = () => useContext(TradeContext)
