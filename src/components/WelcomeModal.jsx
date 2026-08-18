import React, { useEffect, useState } from "react";
import "../styles/welcome-modal.css";

const STORAGE_KEY = "vinylo:welcome-seen";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, []);

  const close = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
    }
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal">
      <div className="welcome-modal__backdrop" onClick={close} />
      <div className="welcome-modal__card" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
        <button className="welcome-modal__close" onClick={close} aria-label="Tutup">
          <CloseGlyph />
        </button>

        <div className="welcome-modal__art">
          <img src="/logo.svg" alt="" className="welcome-modal__logo" />
        </div>

        <h1 id="welcome-modal-title" className="welcome-modal__title">
          Selamat datang di LdxVin
        </h1>
        <p className="welcome-modal__desc">
          Isi sendiri! file /arc/components/WelcomeModal.jsx line 43
        </p>

        <button className="welcome-modal__cta" onClick={close}>
          Mulai Dengarkan
        </button>
      </div>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}