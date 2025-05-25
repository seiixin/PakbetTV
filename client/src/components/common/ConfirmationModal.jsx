import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'danger', // 'danger' | 'primary' | 'success'
  loading = false
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (loading) return;
    await onConfirm();
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <div className="confirmation-modal-overlay" onClick={handleClose}>
      <div className="confirmation-modal" onClick={e => e.stopPropagation()}>
        <h2 className="confirmation-modal-title">{title}</h2>
        <p className="confirmation-modal-message">{message}</p>
        <div className="confirmation-modal-actions">
          <button 
            className="confirmation-modal-button cancel-button" 
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-modal-button confirm-button ${confirmButtonClass} ${loading ? 'loading' : ''}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 