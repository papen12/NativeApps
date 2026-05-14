import { Usuario } from "@/Models/Usuarios";
import React, { createContext, useContext, useState } from "react";

interface AuthContextType {
    usuario: Usuario | null;
    setUsuario: (usuario: Usuario | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    usuario: null,
    setUsuario: () => {},
    logout: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<Usuario | null>(null);

    const logout = () => {
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{ usuario, setUsuario, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}