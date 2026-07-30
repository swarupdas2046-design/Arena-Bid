import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import SmoothScroll from './components/SmoothScroll';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AuctionRoom from './pages/AuctionRoom';
import CreateAuction from './pages/CreateAuction';
import Profile from './pages/Profile';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <div className="min-h-screen bg-base-bg text-base-text overflow-hidden relative transition-colors duration-300">
          <SmoothScroll>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auction/:id" element={<AuctionRoom />} />
              <Route path="/create" element={<CreateAuction />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
            </Routes>
          </SmoothScroll>
        </div>
        <Toaster position="top-right" />
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
