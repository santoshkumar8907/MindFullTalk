import React, { createContext, useState, useCallback } from 'react';
import './UIContext.css';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { title, message, onConfirm, onCancel }

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((title, message, onConfirm) => {
    setModal({ title, message, onConfirm, onCancel: () => setModal(null) });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} animate-slide-in`}>
            <div className="toast-icon">
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <AlertTriangle size={18} />}
              {t.type === 'info' && <Info size={18} />}
            </div>
            <div className="toast-message">{t.message}</div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal Backdrop */}
      {modal && (
        <div className="modal-backdrop animate-fade-in" onClick={modal.onCancel}>
          <div className="modal-box animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle color="#ef4444" size={24} />
              <h3>{modal.title}</h3>
            </div>
            <div className="modal-body">
              <p>{modal.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={modal.onCancel}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { modal.onConfirm(); modal.onCancel(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};
