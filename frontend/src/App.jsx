import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import List from './List'
import Chat from './Chat'
import Bio from './Bio'
import LoginForm from './Login'
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useState } from 'react';

function MainAppLayout() {
  const [selectedChatPartner, setSelectedChatPartner] = useState(null);

  const handleSelectChat = (partner) => {
    setSelectedChatPartner(partner);
  };

  return (
    <div className="app-container">
      <List onSelectChat={handleSelectChat} selectedPartnerId={selectedChatPartner?.id}/>
      <Chat  selectedPartner={selectedChatPartner}/>
      <Bio />
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading application...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainAppLayout />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </ Routes>
  )
}

export default App
