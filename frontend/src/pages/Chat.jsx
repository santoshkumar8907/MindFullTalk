import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { startListening, speak, stopSpeaking, languageOptions } from '../utils/speech';
import { Send, Mic, MicOff, Volume2, VolumeX, PlusCircle, Trash2, Globe, Sparkles, ChevronDown, Copy, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import './Chat.css';

const API = 'http://localhost:5000';
const SESSION_KEY = 'mindfultalk_sessionId';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const { showToast, confirm } = useContext(UIContext);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const langDropdownRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  // ─── Click outside handler for language dropdown ────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, []);

  // ─── On mount: restore session from sessionStorage ────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedId = sessionStorage.getItem(SESSION_KEY);
      if (!storedId || !user) {
        setInitLoading(false);
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${API}/api/chat/session/${storedId}`, config);
        if (data && data._id) {
          setSessionId(data._id);
          setSessionTitle(data.title || '');
          setMessages(data.messages || []);
        } else {
          // Session was deleted; clear storage
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      } finally {
        setInitLoading(false);
      }
    };
    restoreSession();
  }, [user]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── Start a completely new chat ───────────────────────────────
  const startNewChat = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setSessionTitle('');
    setMessages([]);
    setInput('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // ─── Send message ──────────────────────────────────────────────
  const handleSend = async (text, type = 'text') => {
    if (!text.trim() || loading) return;

    // Crisis Detection Interception
    const crisisKeywords = /(die|kill myself|suicid|sucid|hopeless|end my life|give up on life|no reason to live|end it all)/i;
    if (crisisKeywords.test(text)) {
      setShowCrisisModal(true);
      setInput(''); // clear input
      
      // Start continuous alarm
      const playBeep = () => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
          }
        } catch (e) {
          console.warn('Audio API error', e);
        }
      };
      
      if (!alarmIntervalRef.current) {
        playBeep(); // play first beep immediately
        alarmIntervalRef.current = setInterval(playBeep, 1000); // loop every 1 second
      }
      
      return; // STOP execution here. Do not send to AI.
    }

    // Optimistic UI update
    const tempMsg = { _id: `temp_${Date.now()}`, role: 'user', content: text, type };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');
    setLoading(true);

    const selectedLangName = languageOptions.find(opt => opt.code === language)?.name || 'English';

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API}/api/chat/message`, {
        content: text,
        type,
        language: selectedLangName,
        sessionId  // null = new session on backend
      }, config);

      // Persist sessionId in sessionStorage so it survives page navigation
      if (data.sessionId) {
        sessionStorage.setItem(SESSION_KEY, data.sessionId);
        setSessionId(data.sessionId);
      }

      // Replace optimistic message with actual messages from DB
      setMessages(data.messages || []);

      // Speak response if not muted
      if (!isMuted && data.reply) {
        speak(data.reply, language);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      showToast(errMsg, "error");
      setMessages(prev => [
        ...prev.filter(m => m._id !== tempMsg._id),
        { _id: `err_${Date.now()}`, role: 'model', content: errMsg, type: 'text' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete single message ─────────────────────────────────────
  const handleDeleteMessage = (msgId) => {
    if (!sessionId) return;
    confirm("Delete Message", "Are you sure you want to delete this message forever?", async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.delete(
          `${API}/api/chat/message/${sessionId}/${msgId}`, config
        );
        if (data.deletedSession) {
          startNewChat();
          showToast("Session deleted", "info");
        } else {
          setMessages(data.messages || []);
          showToast("Message deleted", "success");
        }
      } catch (err) {
        showToast("Failed to delete message", "error");
      }
    });
  };

  // ─── Copy single message ───────────────────────────────────────
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard", "success");
  };

  // ─── Play/Stop single message ────────────────────────────────────
  const handlePlayMessage = (msgId, content) => {
    if (playingMsgId === msgId) {
      stopSpeaking();
      setPlayingMsgId(null);
    } else {
      stopSpeaking();
      setPlayingMsgId(msgId);
      speak(content, language, () => {
        setPlayingMsgId((prev) => (prev === msgId ? null : prev));
      });
    }
  };

  // ─── Voice ─────────────────────────────────────────────────────
  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current = startListening(
        language,
        (transcript) => { setInput(transcript); setIsListening(false); },
        (error) => { console.error('Speech error:', error); setIsListening(false); }
      );
    }
  };

  if (!user) return <div className="p-4 text-muted">Please log in to chat.</div>;

  return (
    <div className="chat-container animate-fade-in">
      {/* ── Header ── */}
      <div className="chat-header">
        <div className="header-left">
          <h2>MindfulTalk</h2>
          {sessionTitle && (
            <span className="session-label text-muted">{sessionTitle}</span>
          )}
          <button className="btn btn-secondary new-chat-btn" onClick={startNewChat}>
            <PlusCircle size={16} /> New Chat
          </button>
        </div>
        <div className="chat-controls">
          <div className="custom-lang-selector" ref={langDropdownRef}>
            <div className="lang-trigger" onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} title="Select Response Language">
              <Globe size={16} className="text-muted" />
              <span>{languageOptions.find(o => o.code === language)?.name.split(' ')[0]}</span>
              <ChevronDown size={14} className="text-muted" />
            </div>
            {isLangDropdownOpen && (
              <div className="lang-dropdown">
                {languageOptions.map(opt => (
                  <div
                    key={opt.code}
                    className={`lang-option ${language === opt.code ? 'active' : ''}`}
                    onClick={() => {
                      stopSpeaking();
                      setLanguage(opt.code);
                      setIsLangDropdownOpen(false);
                    }}
                  >
                    {opt.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={toggleMute} title={isMuted ? 'Unmute Assistant' : 'Stop/Mute Assistant'}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-window">
        {initLoading ? (
          <div className="chat-placeholder text-muted">Loading your conversation...</div>
        ) : messages.length === 0 ? (
          <div className="chat-placeholder">
            <div className="welcome-icon">🌿</div>
            <h3>How are you feeling today?</h3>
            <p className="text-muted">This is your safe space. Talk, type, or use your voice.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}
            >
              <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                {msg.content}
              </div>
              {msg._id && !msg._id.startsWith('temp_') && !msg._id.startsWith('err_') && (
                <div className="msg-actions">
                  <button
                    className="btn-icon action-btn play-msg-btn"
                    onClick={() => handlePlayMessage(msg._id, msg.content)}
                    title={playingMsgId === msg._id ? "Stop reading" : "Read message"}
                  >
                    {playingMsgId === msg._id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <button
                    className="btn-icon action-btn copy-msg-btn"
                    onClick={() => handleCopy(msg.content)}
                    title="Copy message"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="btn-icon action-btn delete-msg-btn"
                    onClick={() => handleDeleteMessage(msg._id)}
                    title="Delete message"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="chat-bubble-wrapper ai-wrapper">
            <div className="chat-bubble ai-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="chat-input-area">
        <button
          className={`btn-icon mic-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListen}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <input
          type="text"
          className="form-control chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(input); }}
          placeholder="Type your message or use the mic..."
          disabled={loading}
        />
        <button
          className="btn btn-primary send-btn"
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
        >
          <span>Send</span>
          <Send size={18} strokeWidth={2.5} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {/* ── Crisis Modal ── */}
      {showCrisisModal && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
          <div className="modal-box animate-scale-up" style={{ maxWidth: '450px', background: 'var(--surface)', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div className="modal-header" style={{ padding: '2rem 2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle color="#ef4444" size={28} />
              <h3 style={{ color: 'var(--text)', fontSize: '1.25rem', margin: 0, fontWeight: '600' }}>Emergency Support</h3>
            </div>
            <div className="modal-body" style={{ padding: '0 2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                Your life is incredibly valuable. We noticed you are in distress. Please reach out to someone who can help immediately.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <a href="tel:18005990019" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>📞 KIRAN: <span style={{ color: 'var(--primary)' }}>1800-599-0019</span></a>
                <a href="tel:9152987821" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>📞 AASRA: <span style={{ color: 'var(--primary)' }}>9152987821</span></a>
                <a href="tel:112" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>📞 Emergency: <span style={{ color: 'var(--primary)' }}>112</span></a>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 2rem 2rem', background: 'transparent', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setShowCrisisModal(false);
                  if (alarmIntervalRef.current) {
                    clearInterval(alarmIntervalRef.current);
                    alarmIntervalRef.current = null;
                  }
                }}
                style={{
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  color: 'var(--text)',
                  padding: '0.75rem 2.5rem',
                  borderRadius: '24px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '0.95rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.08)'}
                onMouseOut={(e) => e.target.style.background = 'var(--bg-secondary)'}
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

export default Chat;
