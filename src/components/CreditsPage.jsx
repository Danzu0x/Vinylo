import React from "react";
import "../styles/credits-page.css";

export function CreditsPage({ isOpen, onClose }) {
  return (
    <div className={`credits-page ${isOpen ? "credits-page--open" : ""}`} aria-hidden={!isOpen}>
      <header className="credits-page__header">
        <button className="credits-page__back" onClick={onClose} aria-label="Kembali">
          <ChevronLeft />
        </button>
        <span className="credits-page__title">Credits</span>
        <span />
      </header>

      <div className="credits-page__body">
        <div className="credits-page__photo" aria-hidden="true">
          <PersonGlyph />
        </div>
        <h1 className="credits-page__name">Nama</h1>
        <p className="credits-page__desc">
          Deskripsi singkat tentang you.
        </p>
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonGlyph() {
  return (
    <svg width="36%" height="36%" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}