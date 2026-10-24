'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { api, type StoreMeta } from '@/lib/client-utils'

const DEFAULT_META: StoreMeta = {
  store: {
    storeName: 'MALÈTE KITS',
    whatsappNumber: '',
    supportEmail: null,
    storeAddress: null,
    openingHours: null,
    announcement: null,
    deliveryFeeMalete: 1000,
    deliveryFeeOther: 2500,
    customizationFee: 2000,
    pickupFee: 0,
    promoCode: null,
    promoPercent: 0,
    hasPaymentDetails: false,
  },
  categories: [],
  facets: { teams: [], seasons: [], leagues: [] },
}

const MetaContext = createContext<{ meta: StoreMeta | null; store: StoreMeta['store']; facets: StoreMeta['facets'] }>({
  meta: null,
  store: DEFAULT_META.store,
  facets: DEFAULT_META.facets,
})

export function MetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<StoreMeta | null>(null)

  useEffect(() => {
    api<StoreMeta>('/api/meta')
      .then(setMeta)
      .catch(() => setMeta(null))
  }, [])

  const value = meta ?? DEFAULT_META
  return (
    <MetaContext.Provider value={{ meta, store: value.store, facets: value.facets }}>
      {children}
    </MetaContext.Provider>
  )
}

export function useMeta() {
  return useContext(MetaContext)
}
