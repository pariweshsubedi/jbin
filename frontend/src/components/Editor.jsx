import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './Editor.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function Editor() {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(!RECAPTCHA_SITE_KEY);
  const navigate = useNavigate();

  useEffect(() => {
    if (RECAPTCHA_SITE_KEY) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.onload = () => setRecaptchaReady(true);
      document.head.appendChild(script);
    }
  }, []);

  const validateJSON = (text) => {
    if (!text.trim()) {
      return { valid: false, error: 'JSON cannot be empty' };
    }
    try {
      JSON.parse(text);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  };

  const formatJSON = () => {
    const validation = validateJSON(jsonInput);
    if (validation.valid) {
      try {
        const parsed = JSON.parse(jsonInput);
        const formatted = JSON.stringify(parsed, null, 2);
        setJsonInput(formatted);
        setError('');
      } catch (e) {
        setError('Error formatting JSON: ' + e.message);
      }
    } else {
      setError(validation.error);
    }
  };

  const minifyJSON = () => {
    const validation = validateJSON(jsonInput);
    if (validation.valid) {
      try {
        const parsed = JSON.parse(jsonInput);
        const minified = JSON.stringify(parsed);
        setJsonInput(minified);
        setError('');
      } catch (e) {
        setError('Error minifying JSON: ' + e.message);
      }
    } else {
      setError(validation.error);
    }
  };

  const handleShare = async () => {
    const validation = validateJSON(jsonInput);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const parsed = JSON.parse(jsonInput);
      const body = { json: parsed };

      if (RECAPTCHA_SITE_KEY && window.grecaptcha) {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'create_blob' });
        body.recaptchaToken = token;
      }

      const response = await fetch(`${API_URL}/api/blobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create blob');
      }

      const data = await response.json();
      navigate(`/${data.id}`);
    } catch (e) {
      setError('Error sharing JSON: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setJsonInput('');
    setError('');
  };

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h1>JBin</h1>
        <p>Paste, format, and share your JSON</p>
      </header>

      <div className="editor-content">
        <div className="editor-controls">
          <button onClick={formatJSON} className="btn btn-primary">
            Format
          </button>
          <button onClick={minifyJSON} className="btn btn-secondary">
            Minify
          </button>
          <button onClick={handleClear} className="btn btn-secondary">
            Clear
          </button>
          <button
            onClick={handleShare}
            className="btn btn-success"
            disabled={isLoading || !recaptchaReady}
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <textarea
          className="json-editor"
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setError('');
          }}
          placeholder='Paste your JSON here...\n\nExample:\n{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com"\n}'
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default Editor;
