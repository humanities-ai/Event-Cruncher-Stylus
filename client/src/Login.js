/* NOTE: make error messages change language */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import logo from './ECS_logo6.png';
import './Login.css';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  // Topbar menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const { userId } = await response.json();
        localStorage.setItem('loggedInUserId', userId);
        navigate('/root');
      } else {
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  return (
    <>
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>

        <div
          className={`topbar-right ${menuOpen ? 'open' : ''}`}
          ref={menuRef}
        >
          <button
            className="menu-button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <span className="menu-lines" />
          </button>

          <nav className="menu-dropdown" role="menu">
            <Link
              to="/"
              className="menu-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              {t('start_page_label')}
            </Link>
            <Link
              to="/landing-page"
              className="menu-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              {t('landing_page_label')}
            </Link>
            <Link
              to="/create-account"
              className="menu-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              {t('create_account_button')}
            </Link>
          </nav>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="login-container">
        {showPopup && (
          <div className="popup-notification">
            <div className="popup-path">localhost:3000</div>
            <div className="popup-message">
              {t('invalid_credentials', { defaultValue: 'Invalid username or password' })}
            </div>
          </div>
        )}

        <div className="login-content">
          <img src={logo} alt="ECS Logo" className="login-logo" />
          <form onSubmit={handleLogin} className="login-form" noValidate>
            <h2 className="login-title">{t('login_button', { defaultValue: 'Login' })}</h2>

            <div className="login-input-group">
              <input
                type="text"
                id="username"
                className="login-input"
                placeholder={t('username_label', { defaultValue: 'Username' })}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <input
                type="password"
                id="password"
                className="login-input"
                placeholder={t('password_label', { defaultValue: 'Password' })}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {errorMessage && <div className="error-message">{errorMessage}</div>}

            <button type="submit" className="login-btn">
              {t('login_button', { defaultValue: 'Login' })}
            </button>
          </form>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-bar">
        <div className="footer-left">
          {t('footer_left', {
            defaultValue: '© University of Florida, True Digital Poiesis, Event Cruncher Stylus Lab',
          })}
        </div>
        <div className="footer-right">
          {t('footer_right', {
            defaultValue: 'Authored by: Dulick, Hasty, Law, Maxwell, Pope',
          })}
        </div>
      </footer>
    </>
  );
}

export default Login;
