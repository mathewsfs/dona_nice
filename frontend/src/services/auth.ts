export interface User {
  id: string
  username: string
  name: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginCredentials {
  username: string
  password: string
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

class AuthService {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('token')
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao fazer login')
    }

    const data: AuthResponse = await response.json()
    this.token = data.token
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    
    return data
  }

  logout(): void {
    this.token = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  getToken(): string | null {
    return this.token
  }

  getUser(): User | null {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  }

  isAuthenticated(): boolean {
    return !!this.token
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }
}

export const authService = new AuthService()
