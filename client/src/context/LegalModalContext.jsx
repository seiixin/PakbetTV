import React, { createContext, useContext, useState } from 'react';

const LegalModalContext = createContext();

export const useLegalModal = () => {
  const context = useContext(LegalModalContext);
  if (!context) {
    throw new Error('useLegalModal must be used within a LegalModalProvider');
  }
  return context;
};

export const LegalModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'terms'
  });

  const openModal = (type) => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: 'terms' });
  };

  return (
    <LegalModalContext.Provider value={{ modalState, openModal, closeModal }}>
      {children}
    </LegalModalContext.Provider>
  );
}; 