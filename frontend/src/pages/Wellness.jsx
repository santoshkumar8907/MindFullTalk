import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { Download, Sparkles, AlertCircle, FileText } from 'lucide-react';
import axios from 'axios';
import './Wellness.css';

const API = 'https://mindfulltalk.onrender.com';

const Wellness = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(UIContext);
  
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!issue.trim()) return;

    setLoading(true);
    setPlan(null);

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${API}/api/plans`, { issue }, config);
      setPlan(data.planData);
      showToast("Wellness plan generated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate plan. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!plan) return;

    const content = `
=== MINDFULTALK WELLNESS PLAN ===
Issue: ${issue}
Title: ${plan.title}

--- Daily Tasks ---
${plan.dailyTasks.map(t => '- ' + t).join('\n')}

--- Recommendations ---
${plan.recommendations.map(r => '- ' + r).join('\n')}

--- Mindset Shift ---
${plan.mindsetShift}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WellnessPlan_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return <div className="p-4 text-muted">Please log in to use the Wellness Planner.</div>;

  return (
    <div className="wellness-container animate-fade-in">
      <header className="wellness-header">
        <div className="header-icon">
          <Sparkles size={28} />
        </div>
        <div>
          <h2>AI Wellness Planner</h2>
          <p className="text-muted">Describe what you are going through, and let AI build a structured, personalized plan to help you navigate it.</p>
        </div>
      </header>

      <div className="wellness-content">
        <form onSubmit={handleGenerate} className="wellness-form card">
          <div className="form-group">
            <label htmlFor="issue" className="form-label">What's on your mind?</label>
            <textarea
              id="issue"
              className="form-control"
              rows="4"
              placeholder="e.g., I have been feeling extremely burnt out from work lately and can't seem to relax..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              disabled={loading}
              required
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary generate-btn" disabled={loading || !issue.trim()}>
            {loading ? (
              <span className="typing"><span></span><span></span><span></span></span>
            ) : (
              <><Sparkles size={18} /> Generate Plan</>
            )}
          </button>
        </form>

        {plan && (
          <div className="wellness-plan-display card animate-fade-in">
            <div className="plan-header">
              <h3>{plan.title}</h3>
              <button className="btn btn-secondary" onClick={handleDownload}>
                <Download size={16} /> Download
              </button>
            </div>

            <div className="plan-sections">
              <div className="plan-section">
                <h4><FileText size={18} className="text-primary" /> Daily Tasks</h4>
                <ul>
                  {plan.dailyTasks.map((task, idx) => (
                    <li key={idx}>{task}</li>
                  ))}
                </ul>
              </div>

              <div className="plan-section">
                <h4><AlertCircle size={18} className="text-primary" /> Recommendations</h4>
                <ul>
                  {plan.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="plan-section highlight">
                <h4>Mindset Shift</h4>
                <p>"{plan.mindsetShift}"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wellness;
