import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FirmContext = createContext(null)

export function FirmProvider({ children }) {
  const [firm, setFirm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFirm() {
      const { data, error } = await supabase
        .from('firm_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        console.error('Error loading firm settings:', error)
      } else {
        setFirm(data)
      }
      setLoading(false)
    }

    loadFirm()
  }, [])

  return (
    <FirmContext.Provider value={{ firm, loading }}>
      {children}
    </FirmContext.Provider>
  )
}

export function useFirm() {
  const context = useContext(FirmContext)
  if (!context) throw new Error('useFirm must be used within a FirmProvider')
  return context
}