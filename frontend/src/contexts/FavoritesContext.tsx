import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FavoritesContextType {
  favorites: Set<string>
  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('veriart_favorites')
    if (stored) {
      try {
        const arr = JSON.parse(stored)
        setFavorites(new Set(arr))
      } catch {
        // ignore
      }
    }
  }, [])

  const addFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('veriart_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const removeFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.delete(id)
      localStorage.setItem('veriart_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const isFavorite = (id: string) => favorites.has(id)

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
