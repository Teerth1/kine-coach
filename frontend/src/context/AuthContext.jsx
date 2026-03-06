import React, { createContext, useContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email); // OAuth2 expects 'username'
        formData.append('password', password);

        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        if (!res.ok) {
            throw new Error('Login failed');
        }

        const data = await res.json();
        const tk = data.access_token;
        const decoded = jwtDecode(tk);
        setToken(tk);
        window.__kc_token = tk;
        setUser({ email: decoded.sub, role: decoded.role, id: decoded.id });
        return decoded;
    };

    const register = async (email, password, role, fullName) => {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                role,
                full_name: fullName || null,
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Registration failed');
        }

        // Auto-login after successful registration
        return login(email, password);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        window.__kc_token = null;
    };

    const isProvider = user?.role === 'provider';
    const isPatient = user?.role === 'patient';

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user, isProvider, isPatient }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
