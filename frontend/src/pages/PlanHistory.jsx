import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { ArrowLeft, Download, Trash2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import axios from 'axios';
import './Wellness.css';

const API = 'http://localhost:5000';

const PlanHistory = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { showToast, confirm } = useContext(UIContext);
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(`${API}/api/plans/${id}`, config);
        setRecord(data);
      } catch (err) {
        showToast("Failed to load wellness plan", "error");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchPlan();
  }, [id, user]);

  const handleDelete = () => {
    confirm("Delete Wellness Plan", "Are you sure you want to permanently delete this plan?", async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.delete(`${API}/api/plans/${id}`, config);
        showToast("Plan deleted successfully", "success");
        navigate('/dashboard');
      } catch (err) {
        showToast("Error deleting plan", "error");
      }
    });
  };

  const handleDownload = () => {
    if (!record || !record.planData) return;
    const plan = record.planData;

    const content = `
=== MINDFULTALK WELLNESS PLAN ===
Issue: ${record.issue}
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
    a.download = `WellnessPlan_${new Date(record.createdAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-4 text-center">Loading plan...</div>;
  if (!record) return <div className="p-4 text-center">Plan not found.</div>;

  const { planData: plan } = record;

  return (
    <div className="wellness-container animate-fade-in" style={{ paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard" className="btn-icon" style={{ background: 'var(--surface)', border: 'var(--glass-border)' }}>
          <ArrowLeft />
        </Link>
        <button className="btn btn-danger" onClick={handleDelete} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #ef4444' }}>
          <Trash2 size={16}/> Delete Plan
        </button>
      </div>

      <header className="wellness-header" style={{ padding: '1.5rem' }}>
        <div className="header-icon" style={{ width: '50px', height: '50px' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>Past Wellness Plan</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Created on {new Date(record.createdAt).toLocaleDateString()}</p>
        </div>
      </header>

      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--surface)' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Your Issue:</h4>
        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text)' }}>"{record.issue}"</p>
      </div>

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
    </div>
  );
};

export default PlanHistory;
