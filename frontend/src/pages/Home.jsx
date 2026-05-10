import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, Activity, Shield, MessageCircle, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useContext(AuthContext);

  // If already logged in, send directly to dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="home-container animate-fade-in">
      <header className="hero-section" id="hero">
        <h1 className="hero-title">Your Safe Space for Mental Wellness</h1>
        <p className="hero-subtitle">
          MindfulTalk uses advanced AI to listen, understand, and guide you toward a healthier state of mind. 
          Real-time emotional tracking and multilingual support.
        </p>
        <Link to="/register" className="btn btn-primary btn-large">Start Your Journey</Link>
      </header>

      <section className="features-section" id="features">
        <div className="section-header">
          <h2>Core Features</h2>
          <p className="text-muted">Designed to support your mental wellbeing every step of the way.</p>
        </div>
        <div className="features-grid">
          <div className="card feature-card">
            <MessageCircle className="feature-icon" size={32} />
            <h3>Multilingual AI Chat</h3>
            <p>Talk or type to our AI companion in your native language without any judgment.</p>
          </div>
          <div className="card feature-card">
            <Activity className="feature-icon" size={32} />
            <h3>Emotion Tracking</h3>
            <p>Visualize your emotional patterns and watch yourself grow day by day.</p>
          </div>
          <div className="card feature-card">
            <Heart className="feature-icon" size={32} />
            <h3>Rewarding Growth</h3>
            <p>Build streaks and unlock milestones as you dedicate time to your mental health.</p>
          </div>
          <div className="card feature-card">
            <Shield className="feature-icon" size={32} />
            <h3>Private &amp; Secure</h3>
            <p>Your conversations are safely stored and completely private to you.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p className="text-muted">Experience the seamless flow of mindful support.</p>
        </div>
        
        <div className="system-visual-animation">
          <div className="system-node user-node">
            <User size={32} />
            <span>You</span>
          </div>
          <div className="system-flow-path">
            <div className="flow-particle"></div>
          </div>
          <div className="system-node ai-node">
            <MessageCircle size={32} />
            <span>Mindful AI</span>
          </div>
          <div className="system-flow-path">
            <div className="flow-particle delay-particle"></div>
          </div>
          <div className="system-node graph-node">
            <Activity size={32} />
            <span>Wellness Hub</span>
          </div>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-num">1</div>
            <h4>Check-In</h4>
            <p>Share your thoughts via text or voice in any language you prefer.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h4>AI Analysis</h4>
            <p>Gemini AI understands your emotions and provides empathetic feedback.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h4>Track Progress</h4>
            <p>Earn XP, build streaks, and watch your mood trend improve over time.</p>
          </div>
        </div>
      </section>

      <section className="testimonials" id="testimonials">
        <div className="section-header">
          <h2>What Users Say</h2>
        </div>
        <div className="testimonial-grid">
          <div className="card testimonial-card">
            <p>"MindfulTalk helped me articulate my feelings when I was at my lowest. The AI is incredibly empathetic."</p>
            <div className="user-info"><strong>– Sarah J.</strong></div>
          </div>
          <div className="card testimonial-card">
            <p>"The multilingual support is a game changer. I can express myself in Hindi and it understands perfectly."</p>
            <div className="user-info"><strong>– Rahul K.</strong></div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>&copy; 2026 MindfulTalk. Your journey to wellness starts here.</p>
      </footer>
    </div>
  );
};

export default Home;

