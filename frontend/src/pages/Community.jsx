import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, Users, Wifi, Shield, Hash } from 'lucide-react';
import './Community.css';

const SOCKET_URL = 'http://localhost:5000';
const USERNAME_KEY = 'community_username';
const USERNAME_COLOR_KEY = 'community_color';

// Crisis detection (same as Chat)
const CRISIS_REGEX = /(die|kill myself|suicid|sucid|hopeless|end my life|give up on life|no reason to live|end it all)/i;

// Generate a random color for the user's own messages
const AVATAR_COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6'
];

const Community = () => {
  const [username, setUsername]         = useState('');
  const [draftName, setDraftName]       = useState('');
  const [joined, setJoined]             = useState(false);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [onlineCount, setOnlineCount]   = useState(0);
  const [showCrisis, setShowCrisis]     = useState(false);
  const [nameError, setNameError]       = useState('');

  const socketRef   = useRef(null);
  const chatEndRef  = useRef(null);
  const alarmRef    = useRef(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Restore username from session
  useEffect(() => {
    const saved = sessionStorage.getItem(USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      connectSocket(saved);
    }
  }, []);

  // Cleanup socket + alarm on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (alarmRef.current) clearInterval(alarmRef.current);
    };
  }, []);

  const connectSocket = (name) => {
    const sock = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('community:join', { username: name });
      setJoined(true);
    });

    sock.on('community:history', (history) => {
      setMessages(history.map(m => ({ ...m, type: 'msg' })));
    });

    sock.on('community:message', (msg) => {
      setMessages(prev => [...prev, { ...msg, type: 'msg' }]);
    });

    sock.on('community:system', (sys) => {
      setMessages(prev => [...prev, { ...sys, type: 'system', _id: Date.now() }]);
    });

    sock.on('community:stats', ({ online }) => {
      setOnlineCount(online);
    });

    sock.on('disconnect', () => setJoined(false));
  };

  const handleJoin = () => {
    const trimmed = draftName.trim();
    if (!trimmed) { setNameError('Please enter a username.'); return; }
    if (trimmed.length < 2) { setNameError('Username must be at least 2 characters.'); return; }
    if (trimmed.length > 20) { setNameError('Username must be 20 characters or less.'); return; }

    sessionStorage.setItem(USERNAME_KEY, trimmed);
    setUsername(trimmed);
    setNameError('');
    connectSocket(trimmed);
  };

  const playAlarm = () => {
    const playBeep = () => {
      try {
        const ACtx = window.AudioContext || window.webkitAudioContext;
        if (!ACtx) return;
        const ctx  = new ACtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
      } catch (e) { console.warn(e); }
    };
    if (!alarmRef.current) {
      playBeep();
      alarmRef.current = setInterval(playBeep, 1000);
    }
  };

  const stopAlarm = () => {
    if (alarmRef.current) {
      clearInterval(alarmRef.current);
      alarmRef.current = null;
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;

    // Crisis interception
    if (CRISIS_REGEX.test(text)) {
      setInput('');
      setShowCrisis(true);
      playAlarm();
      return;
    }

    socketRef.current.emit('community:message', { text });
    setInput('');
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getInitial = (name) => name?.charAt(0).toUpperCase() || '?';

  // ── Username Gate ─────────────────────────────────────────────────
  if (!username) {
    return (
      <div className="community-gate animate-fade-in">
        <div className="gate-card animate-scale-up">
          <div className="gate-icon">🌐</div>
          <h2>Join the Community Room</h2>
          <p className="gate-sub">An anonymous safe space to share your thoughts & emotions with others.</p>
          <div className="gate-badge"><Shield size={14} /> Your real identity stays hidden</div>
          <div className="gate-field">
            <label>Choose an anonymous username</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. CalmStar, MindfulMoon..."
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              autoFocus
            />
            {nameError && <span className="gate-error">{nameError}</span>}
          </div>
          <button className="btn btn-primary gate-btn" onClick={handleJoin}>
            Enter Room <Hash size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Main Community Room ───────────────────────────────────────────
  return (
    <div className="community-container animate-fade-in">

      {/* Header */}
      <div className="community-header">
        <div className="community-header-left">
          <Hash size={22} className="channel-icon" />
          <div>
            <h2>Community Room</h2>
            <p className="header-sub">Anonymous emotional support space</p>
          </div>
        </div>
        <div className="community-stats">
          <span className="stat-badge online-badge">
            <span className="online-dot" />
            {onlineCount} online
          </span>
          <span className="stat-badge identity-badge">
            <Shield size={12} />
            Anonymous
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="community-feed">
        {messages.length === 0 && (
          <div className="feed-empty">
            <div className="empty-icon">💬</div>
            <p>Be the first to share something today...</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg._id || i} className="system-msg">
                {msg.text}
              </div>
            );
          }

          const isOwn = msg.username === username;
          return (
            <div key={msg._id || i} className={`community-msg ${isOwn ? 'own-msg' : ''}`}>
              <div
                className="msg-avatar"
                style={{ background: msg.color || '#6366f1' }}
              >
                {getInitial(msg.username)}
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-username" style={{ color: msg.color || '#6366f1' }}>
                    {msg.username} {isOwn && <span className="you-badge">you</span>}
                  </span>
                  <span className="msg-time">{formatTime(msg.createdAt || msg.timestamp)}</span>
                </div>
                <div className="msg-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="community-input-area">
        <input
          type="text"
          className="form-control community-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
          placeholder={`Share your thoughts as ${username}...`}
          maxLength={500}
          disabled={!joined}
        />
        <button
          className="btn btn-primary send-btn"
          onClick={handleSend}
          disabled={!input.trim() || !joined}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Crisis Modal — same style as deletion modal */}
      {showCrisis && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-box animate-scale-up" style={{ maxWidth: '450px', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div className="modal-header" style={{ padding: '2rem 2rem 1rem', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <h3 style={{ color: 'var(--text)', fontSize: '1.25rem', margin: 0, fontWeight: '600' }}>Emergency Support</h3>
            </div>
            <div className="modal-body" style={{ padding: '0 2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: '1.6' }}>
                Your life is incredibly valuable. Please reach out to one of these 24/7 helplines immediately.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="tel:18005990019" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500' }}>📞 KIRAN: <span style={{ color: 'var(--primary)' }}>1800-599-0019</span></a>
                <a href="tel:9152987821"  style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500' }}>📞 AASRA: <span style={{ color: 'var(--primary)' }}>9152987821</span></a>
                <a href="tel:112"          style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500' }}>📞 Emergency: <span style={{ color: 'var(--primary)' }}>112</span></a>
              </div>
              <p style={{ fontStyle: 'italic', color: 'var(--primary)', margin: 0, fontWeight: '500' }}>
                "Things can and will get better. You are not alone."
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '0 2rem 2rem', background: 'transparent' }}>
              <button
                onClick={() => { setShowCrisis(false); stopAlarm(); }}
                style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text)', padding: '0.75rem', borderRadius: '24px', fontWeight: '500', cursor: 'pointer', width: '100%', fontSize: '0.95rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
