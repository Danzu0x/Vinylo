import React, { useEffect } from "react";
import "../styles/side-nav.css";

const NAV_ITEMS = [{ id: "credits", label: "Credits" }];

export function SideNav({ isOpen, onClose, onNavigate }) {
  useEffect(() => {
    document.body.classList.toggle("scroll-locked", isOpen);
    return () => document.body.classList.remove("scroll-locked");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <div className={`side-nav ${isOpen ? "side-nav--open" : ""}`} aria-hidden={!isOpen}>
      <div className="side-nav__backdrop" onClick={onClose} />
      <nav className="side-nav__panel">
        <header className="side-nav__header">
          <span className="side-nav__title">Menu</span>
          <button className="side-nav__close" onClick={onClose} aria-label="Tutup menu">
            <CloseGlyph />
          </button>
        </header>

        <ul className="side-nav__list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                className="side-nav__item"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
              >
                {item.label}
                <ChevronRight />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}