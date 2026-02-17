import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from './ECS_logo6.png';
import './LandingPage.css';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import Select from 'react-select';

const LandingPage = () => {
  const { t } = useTranslation();

  const options = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch | German' },
    { value: 'zh', label: '普通话 | Mandarin' }
  ];

  const currentLang = options.find(opt => opt.value === i18n.language) || options[0];

  const handleLanguageChange = (selectedOption) => {
    i18n.changeLanguage(selectedOption.value);
  };

  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest('.menu-button');
      const wrapper = e.target.closest('.topbar-right');
      document.querySelectorAll('.topbar-right').forEach(el => {
        if (el !== wrapper) el.classList.remove('open');
      });
      if (btn && wrapper) {
        wrapper.classList.toggle('open');
        btn.setAttribute('aria-expanded', wrapper.classList.contains('open'));
      } else {
        document.querySelectorAll('.topbar-right').forEach(el => el.classList.remove('open'));
      }
    };

    document.addEventListener('click', handleClick);

    // cleanup when component unmounts
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="home-container">
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>

        <div className="topbar-right">
          <button className="menu-button" aria-haspopup="true" aria-expanded="false">
            {/* simple hamburger */}
            <span className="menu-lines" />
          </button>

          <nav className="menu-dropdown" role="menu">
            <Link to="/" className="menu-item" role="menuitem">{t('start_page_label')}</Link>
            <Link to="/login" className="menu-item" role="menuitem">{t('login_button')}</Link>
            <Link to="/create-account" className="menu-item" role="menuitem">{t('create_account_button')}</Link>
          </nav>
        </div>
      </header>

      {/* MAIN PAGE CONTENT */}
      <img src={logo} alt="ECS Logo" className="home-logo" />
      <h1 className="ecs-title">{t('landing_heading')}</h1>

      <div className="language-bar">
        <span className="language-label">{t('language_label')}</span>
        <Select
          defaultValue={currentLang}
          onChange={handleLanguageChange}
          options={options}
          isSearchable={false}
          className="language-select"
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: '#3AB07E',
              border: 'none',
              borderRadius: '6px',
              minHeight: '38px',
              width: '140px',
              color: '#fff',
              boxShadow: state.isFocused
                ? '0 0 0 2px rgba(58,176,126,0.4)'
                : '0 2px 4px rgba(0,0,0,0.15)',
              cursor: 'pointer',
            }),
            singleValue: (base) => ({
              ...base,
              color: '#fff',
              fontWeight: '600',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? '#f0f0f0' : '#fff',
              color: '#000',
              cursor: 'pointer',
            }),
            dropdownIndicator: (base) => ({
              ...base,
              color: '#fff',
              padding: '0 8px',
              '&:hover': { color: '#f0f0f0' },
            }),
            menu: (base) => ({
              ...base,
              borderRadius: '6px',
              marginTop: '4px',
            }),
            indicatorSeparator: () => ({ display: 'none' }),
          }}
        />
      </div>

      <div className="navigation-buttons">
        <Link to="/login">
          <button className="navigation-button">{t('login_button')}</button>
        </Link>
        <Link to="/create-account">
          <button className="navigation-button">{t('create_account_button')}</button>
        </Link>
      </div>

      <footer className="footer-bar">
        <div className="footer-left">{t('footer_left')}</div>
        <div className="footer-right">{t('footer_right')}</div>
      </footer>

    </div>
  );
};

export default LandingPage;

