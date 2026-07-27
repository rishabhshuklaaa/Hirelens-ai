import { createContext, useState, useContext, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if a valid cookie exists by calling /auth/me
  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data); // User is logged in, set state
      } catch (error) {
        setUser(null); // No valid cookie, user is logged out
      } finally {
        setLoading(false); // Stop loading regardless of success/failure
      }
    };
    checkUser();
  }, []);

  const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    setUser(response.data);
    return response;
  };

  const signup = async (userData) => {
    const response = await api.post("/auth/signup", userData);
    return response;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext easily
export const useAuth = () => {
  return useContext(AuthContext);
};