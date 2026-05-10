import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import ChatHistory from './pages/ChatHistory';
import PlanHistory from './pages/PlanHistory';
import Progress from './pages/Progress';
import Wellness from './pages/Wellness';
import Community from './pages/Community';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/history/:id" element={<ChatHistory />} />
              <Route path="/plan/:id" element={<PlanHistory />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/wellness" element={<Wellness />} />
              <Route path="/community" element={<Community />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  </UIProvider>
  );
}

export default App;
