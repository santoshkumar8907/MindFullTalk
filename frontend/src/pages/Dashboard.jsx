import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { Link } from 'react-router-dom';
import { Flame, Trophy, MessageCircle, Trash2, Clock, Star, Sparkles, FileText } from 'lucide-react';
import axios from 'axios';
import './Dashboard.css';

const MILESTONES = [
  { count: 1,  label: 'First Step 🌱' },
  { count: 5,  label: 'Opening Up 🌿' },
  { count: 10, label: 'Consistency 🌳' },
  { count: 25, label: 'Committed Mind 💪' },
  { count: 50, label: 'Wellness Warrior 🏆' },
];

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { showToast, confirm } = useContext(UIContext);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [profile, setProfile] = useState(null);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const [historyRes, profileRes, plansRes] = await Promise.all([
        axios.get('http://localhost:5000/api/chat/history', config),
        axios.get('http://localhost:5000/api/auth/profile', config),
        axios.get('http://localhost:5000/api/plans', config).catch(() => ({ data: [] }))
      ]);
      setHistory(historyRes.data);
      setProfile(profileRes.data);
      setPlans(plansRes.data);
    } catch (err) {
      showToast("Failed to sync your wellness data", "error");
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleDeleteSession = (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();
    confirm("Delete Conversation", "This will permanently remove this chat and its insights. Are you sure?", async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`http://localhost:5000/api/chat/session/${sessionId}`, config);
        setHistory(prev => prev.filter(s => s._id !== sessionId));
        showToast("Conversation deleted successfully", "success");
      } catch (err) {
        showToast("Error deleting session", "error");
      }
    });
  };

  if (!user) return <div className="p-4">Please log in</div>;

  const streak = Number(profile?.gamification?.streak || user.streak || 0);
  const points = Number(profile?.gamification?.points || user.points || 0);
  const level = Math.floor(points / 500) + 1;
  const totalChats = history.length;
  
  const combinedActivity = [
    ...history.map(h => ({ ...h, type: 'chat', sortDate: new Date(h.createdAt).getTime() })),
    ...plans.map(p => ({ ...p, type: 'plan', sortDate: new Date(p.createdAt).getTime() }))
  ].sort((a, b) => b.sortDate - a.sortDate);
  
  const getLevelInfo = (pts) => {
    if (pts < 100) return { name: 'Mindful Beginner', next: 100, prev: 0 };
    if (pts < 500) return { name: 'Peace Seeker', next: 500, prev: 100 };
    if (pts < 1500) return { name: 'Wellness Explorer', next: 1500, prev: 500 };
    if (pts < 5000) return { name: 'Mindful Master', next: 5000, prev: 1500 };
    return { name: 'Zen Legend', next: pts, prev: 0 };
  };

  const levelInfo = getLevelInfo(points);
  const progress = levelInfo.next === points ? 100 : ((points - levelInfo.prev) / (levelInfo.next - levelInfo.prev)) * 100;

  const currentMilestone = MILESTONES.filter(m => totalChats >= m.count).pop() || null;
  const nextMilestone = MILESTONES.find(m => totalChats < m.count);

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div className="header-top">
          <div>
            <h1>Welcome back, {user.username}! 👋</h1>
            <p className="text-muted">You are a <strong>{levelInfo.name}</strong></p>
          </div>
          <div className="level-badge">
            <div className="level-progress-ring">
              <span className="level-num">{level}</span>
            </div>
            <span className="level-label">Level {level}</span>
          </div>
        </div>
        <div className="points-progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{points} / {levelInfo.next} XP</span>
        </div>
      </header>

      <section className="gamification-cards">
        <div className="card streak-card">
          <Flame size={40} color="#ff7b54" />
          <div className="streak-info">
            <h3>{streak} Day{streak !== 1 ? 's' : ''} Streak 🔥</h3>
            <p>{streak > 0 ? 'Keep going! You\'re on a roll.' : 'Start chatting to build a streak!'}</p>
          </div>
        </div>

        <div className="card streak-card">
          <Star size={40} color="#f59e0b" />
          <div className="streak-info">
            <h3>{points} Wellness Points ✨</h3>
            <p>Earn points by engaging in mindful talk.</p>
          </div>
        </div>

        <div className="card streak-card">
          <Trophy size={40} color="#ffb26b" />
          <div className="streak-info">
            <h3>{currentMilestone ? currentMilestone.label : 'Getting Started'}</h3>
            <p>
              {nextMilestone 
                ? `Next: ${nextMilestone.label} (${nextMilestone.count - totalChats} to go!)`
                : 'You\'re a Wellness Legend! 🎉'
              }
            </p>
          </div>
        </div>
      </section>

      <section className="actions-section">
        <div className="card action-card">
          <h3>Ready to talk?</h3>
          <p>Your AI companion is here to listen and help you reflect.</p>
          <Link to="/chat" className="btn btn-primary">
            <MessageCircle size={18}/> Start Mindful Chat
          </Link>
        </div>
      </section>

      <section className="history-section">
        <div className="section-header">
          <h3>Recent Activity</h3>
          <span className="text-muted">{combinedActivity.length} items</span>
        </div>

        {combinedActivity.length === 0 ? (
          <div className="card no-history">
            <p>No activity yet. <Link to="/chat">Start your first chat!</Link></p>
          </div>
        ) : (
          <div className="history-list">
            {combinedActivity.map((item) => (
              item.type === 'chat' ? (
                <Link
                  to={`/history/${item._id}`}
                  key={`chat-${item._id}`}
                  className="card history-item"
                >
                  <div className="history-info">
                    <div className="history-date">
                      <MessageCircle size={15}/>
                      {item.title || new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div className="history-emotion">
                      Mood: <strong>{item.dominantEmotion}</strong>
                      <span className={`emotion-badge emotion-${item.dominantEmotion?.toLowerCase()}`}>
                        Score: {item.dailyEmotionScore}/10
                      </span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <span className="msg-count">{item.messages.length} messages</span>
                    <button
                      className="btn-icon delete-session-btn"
                      onClick={(e) => handleDeleteSession(e, item._id)}
                      title="Delete session"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Link>
              ) : (
                <Link to={`/plan/${item._id}`} key={`plan-${item._id}`} className="card history-item" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div className="history-info">
                    <div className="history-date" style={{ color: 'var(--primary)' }}>
                      <Sparkles size={15} />
                      Wellness Plan: {item.planData?.title || 'Generated Plan'}
                    </div>
                    <div className="history-emotion">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Issue: {item.issue.length > 50 ? item.issue.substring(0, 50) + '...' : item.issue}
                      </span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <span className="msg-count">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              )
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
