import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Leaf, LogOut, User, BarChart2, MessageCircle, Menu, X, Sparkles, Users } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const scrollToSection = (id) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" onClick={() => scrollToSection('hero')}>
            <Leaf className="brand-icon" />
            <span>MindfulTalk</span>
          </Link>
        </div>

        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>

        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}><User size={18} /> Dashboard</Link>
              <Link to="/wellness" className="nav-link" onClick={() => setIsOpen(false)}><Sparkles size={18} /> Plan</Link>
              <Link to="/chat" className="nav-link" onClick={() => setIsOpen(false)}><MessageCircle size={18} /> Chat</Link>
              <Link to="/community" className="nav-link" onClick={() => setIsOpen(false)}><Users size={18} /> Community</Link>
              <Link to="/progress" className="nav-link" onClick={() => setIsOpen(false)}><BarChart2 size={18} /> Progress</Link>
              <button onClick={toggleTheme} className="theme-toggle">🌓</button>
              <button onClick={handleLogout} className="btn-logout"><LogOut size={18} /> Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => scrollToSection('features')} className="nav-link-btn">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="nav-link-btn">How it Works</button>
              <button onClick={() => scrollToSection('testimonials')} className="nav-link-btn">Reviews</button>
              <button onClick={toggleTheme} className="theme-toggle">🌓</button>
              <Link to="/login" className="nav-link" onClick={() => setIsOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary" onClick={() => setIsOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
