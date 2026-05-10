import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { ArrowLeft, Trash2, Copy, Volume2, VolumeX } from 'lucide-react';
import { speak, stopSpeaking } from '../utils/speech';
import axios from 'axios';
import './ChatHistory.css';

const ChatHistory = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { showToast, confirm } = useContext(UIContext);
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingMsgId, setPlayingMsgId] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`http://localhost:5000/api/chat/session/${id}`, config);
        setSession(data);
      } catch (err) {
        showToast("Failed to load chat history", "error");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchSession();
  }, [id, user]);

  const handleDeleteSession = () => {
    confirm("Delete Entire Chat", "Are you sure you want to delete this full session? This cannot be undone.", async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`http://localhost:5000/api/chat/session/${id}`, config);
        showToast("Conversation deleted successfully", "success");
        navigate('/dashboard');
      } catch (err) {
        showToast("Error deleting session", "error");
      }
    });
  };

  const handleDeleteMessage = (msgId) => {
    confirm("Delete Message", "Remove this message from history?", async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.delete(`http://localhost:5000/api/chat/message/${id}/${msgId}`, config);
        if (data.deletedSession) {
          showToast("Session deleted (no messages left)", "info");
          navigate('/dashboard');
        } else {
          setSession(data);
          showToast("Message removed", "success");
        }
      } catch (err) {
        showToast("Error removing message", "error");
      }
    });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard", "success");
  };

  const handlePlayMessage = (msgId, content) => {
    if (playingMsgId === msgId) {
      stopSpeaking();
      setPlayingMsgId(null);
    } else {
      stopSpeaking();
      setPlayingMsgId(msgId);
      // We don't have language stored per message in history, so we use English as default, or whatever
      speak(content, 'en-US', () => {
        setPlayingMsgId((prev) => (prev === msgId ? null : prev));
      });
    }
  };

  if (loading) return <div className="p-4">Loading history...</div>;
  if (!session) return <div className="p-4">Session not found.</div>;

  return (
    <div className="history-page-container animate-fade-in">
      <header className="history-header">
        <div className="header-left">
          <Link to="/dashboard" className="btn-icon"><ArrowLeft /></Link>
          <div>
            <h2>{session.title || 'Chat Session'}</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {new Date(session.createdAt).toLocaleString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              })}
            </p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn btn-danger" onClick={handleDeleteSession}>
            <Trash2 size={18}/> Delete Chat
          </button>
        </div>
      </header>

      <div className="card history-window">
        {session.messages.map((msg) => (
          <div key={msg._id} className={`history-bubble-wrapper ${msg.role === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
            <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
              {msg.content}
            </div>
            <div className="msg-actions">
              <button className="btn-icon action-btn play-msg-btn" onClick={() => handlePlayMessage(msg._id, msg.content)} title={playingMsgId === msg._id ? "Stop reading" : "Read message"}>
                {playingMsgId === msg._id ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button className="btn-icon action-btn copy-msg-btn" onClick={() => handleCopy(msg.content)} title="Copy message">
                <Copy size={15} />
              </button>
              <button className="btn-icon action-btn delete-msg-btn" onClick={() => handleDeleteMessage(msg._id)} title="Delete message">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistory;
