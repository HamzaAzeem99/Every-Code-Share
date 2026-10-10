import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { AlertTriangle, Home as HomeIcon, ArrowLeft } from 'lucide-react';
import './Error.css';

function Error() {
  const navigate = useNavigate();

  return (
    <div className="error-fullpage-container entry-fade">
      {/* TOP HEADER */}
      <header className="air-navbar">
        <div className="nav-brand">
          <img src={logo} alt="Logo" className="nav-logo" />
          <span className="brand-text">
            everycode<span className="bold-text">share</span>
          </span>
        </div>
        <nav className="nav-links">
          <span className="link-item" onClick={() => navigate('/')}>Home</span>
          <span className="link-item active-link">404 Error</span>
        </nav>
      </header>

      {/* FULL PAGE MAIN CONTENT */}
      <main className="error-content-body">
        <div className="error-code-badge">
          <AlertTriangle size={16} /> Error 404
        </div>

        <h1 className="error-main-title">
          Page <span className="highlight-red">Not Found</span>
        </h1>

        <h2 className="error-heading">
          Looks like you've wandered into unknown territory.
        </h2>

        <p className="error-message">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* ACTION BUTTONS */}
        <div className="error-actions">
          <button 
            className="air-primary-btn" 
            onClick={() => navigate('/')}
          >
            <HomeIcon size={18} /> Back to Home
          </button>
          
          <button 
            className="air-secondary-btn" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="air-footer">
        <p>© 2026 EveryCodeShare.com</p>
      </footer>
    </div>
  );
}

export default Error;