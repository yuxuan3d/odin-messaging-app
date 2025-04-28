import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api'; 
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for initial session check

  // Check session on initial load
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        // Assume '/profile' or similar endpoint returns the logged-in user if session is valid
        const response = await api.get('/profile');
        setCurrentUser(response.data.user);
      } catch (error) {
        console.log("No active session or error checking session:", error.response?.data?.message || error.message);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []); // Empty dependency array means run once on mount

  const login = async (username, password) => {
    // setLoading(true); // Optional: set loading specific to login action
    try {
      const response = await api.post('/login', { username, password });
      setCurrentUser(response.data.user);
      return response.data; // Success
    } catch (error) {
      console.error("Login failed in AuthContext:", error);
      setCurrentUser(null);
      throw error; // Re-throw to be caught in the component
    } finally {
      // setLoading(false);
    }
  };

  const logout = async () => {
    // setLoading(true); // Optional: set loading specific to logout action
    try {
      await api.post('/logout');
    } catch (error) {
      console.error("Logout failed in AuthContext:", error);
      // Decide if you want to throw or just log
    } finally {
      setCurrentUser(null); // Always clear user on frontend logout attempt
      // setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading, // Expose loading state for initial check
    login,
    logout,
    isAuthenticated: !!currentUser, // Derived boolean state
  };

  // Render children only after the initial session check is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};