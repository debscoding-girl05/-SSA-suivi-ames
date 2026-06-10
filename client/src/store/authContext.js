import { createContext } from 'react';

// Auth context shape: { user, status, login, logout }
// status: 'loading' | 'authenticated' | 'anonymous'
export const AuthContext = createContext(null);
