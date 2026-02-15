import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useConfig } from '../ConfigContext';
import { useTheme } from '../ThemeContext';
import { API_URL } from '../config';
import './Editor.css';

function Editor() {
  const { config, loading: configLoading } = useConfig();
  const { theme } = useTheme();
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const navigate = useNavigate();

  const editorRef = useRef(null);
  const recaptchaSiteKey = config?.recaptcha?.siteKey;

  useEffect(() => {
    if (configLoading) return;

    if (recaptchaSiteKey) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
      script.onload = () => setRecaptchaReady(true);
      document.head.appendChild(script);
    } else {
      setRecaptchaReady(true);
    }
  }, [configLoading, recaptchaSiteKey]);

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

      if (recaptchaSiteKey && window.grecaptcha) {
        const token = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'create_blob' });
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
      if (!data.id || !/^[A-Za-z0-9_-]+$/.test(data.id)) {
        throw new Error('Invalid response from server');
      }
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
            disabled={isLoading || configLoading || !recaptchaReady}
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="monaco-wrapper">
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={jsonInput}
            onChange={(value) => {
              setJsonInput(value || '');
              setError('');
            }}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 16 },
              renderLineHighlight: 'gutter',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Editor;
