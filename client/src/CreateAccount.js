/* NOTE: make error messages change language */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import logo from './ECS_logo6.png';
import './CreateAccount.css';

function CreateAccount() {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const navigate = useNavigate();

  /* --- topbar dropdown --- */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const validatePassword = (p) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(p);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');

    if (password !== confirmPassword) {
      setPasswordError(t('passwords_mismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }
    if (!validatePassword(password)) {
      setPasswordError(
        t('password_rules', {
          defaultValue:
            'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character',
        })
      );
      return;
    }

    try {
      const resp = await fetch('http://localhost:4000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (resp.ok) {
        const data = await resp.json();   // { message, userId }

        // Save new user's ID so CubicLevel loads THEIR cube, not admin's
        localStorage.setItem("loggedInUserId", String(data.userId));

        navigate('/root');
      }
      else {
        const err = await resp.json();
        if (err.error === 'Username already exists') {
          setUsernameError(
            t('username_taken', {
              defaultValue: 'This username is already taken. Please choose another one.',
            })
          );
        } else {
          console.error('Error creating account:', err.error);
        }
      }
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  return (
    <>
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>

        <div className={`topbar-right ${menuOpen ? 'open' : ''}`} ref={menuRef}>
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
            <Link to="/" className="menu-item" onClick={() => setMenuOpen(false)}>
              {t('start_page_label', { defaultValue: 'Start Page' })}
            </Link>
            <Link to="/landing-page" className="menu-item" onClick={() => setMenuOpen(false)}>
              {t('landing_page_label')}
            </Link>
            <Link to="/login" className="menu-item" onClick={() => setMenuOpen(false)}>
              {t('login_button', { defaultValue: 'Login' })}
            </Link>
          </nav>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="ca-container">
        <div className="ca-content">
          <img src={logo} alt="ECS Logo" className="ca-logo" />

          <form onSubmit={handleSubmit} className="ca-form" noValidate>
            <h2 className="ca-title">
              {t('create_account_msg', { defaultValue: 'Create Your Account' })}
            </h2>

            <div className="ca-input-group">
              <input
                type="text"
                id="username"
                className="ca-input"
                placeholder={t('username_label', { defaultValue: 'Username' })}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              {usernameError && <div className="error-message">{usernameError}</div>}

              <input
                type="password"
                id="password"
                className="ca-input"
                placeholder={t('password_label', { defaultValue: 'Password' })}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <input
                type="password"
                id="confirmPassword"
                className="ca-input"
                placeholder={t('confirm_password_label', { defaultValue: 'Confirm Password' })}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              {passwordError && <div className="error-message">{passwordError}</div>}
            </div>

            <button type="submit" className="ca-btn">
              {t('create_account_button', { defaultValue: 'Create Account' })}
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

export default CreateAccount;
