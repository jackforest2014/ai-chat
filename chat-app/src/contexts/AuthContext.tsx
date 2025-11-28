'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        // Invalid stored user, clear it
        localStorage.removeItem(USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success && data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem(STORAGE_KEY, data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        return { success: true }
      }

      return { success: false, message: data.message || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Network error. Please try again.' }
    }
  }, [backendUrl])

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${backendUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (data.success && data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem(STORAGE_KEY, data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        return { success: true }
      }

      return { success: false, message: data.message || 'Signup failed' }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, message: 'Network error. Please try again.' }
    }
  }, [backendUrl])

  const logout = useCallback(() => {
    // Call logout endpoint (fire and forget)
    if (token) {
      fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {
        // Ignore errors on logout
      })
    }

    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_KEY)
  }, [backendUrl, token])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
