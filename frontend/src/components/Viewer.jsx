import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useTheme } from '../ThemeContext';
import { API_URL } from '../config';
import './Viewer.css';

function Viewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [jsonData, setJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlob = async () => {
      if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
        setError('Invalid blob ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/blobs/${encodeURIComponent(id)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('JSON blob not found');
          } else {
            setError('Failed to load JSON blob');
          }
          return;
        }

        const data = await response.json();
        setJsonData(data);
      } catch (e) {
        setError('Error loading JSON: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlob();
  }, [id]);

  const copyToClipboard = async () => {
    if (jsonData) {
      try {
        const formatted = JSON.stringify(jsonData.json, null, 2);
        await navigator.clipboard.writeText(formatted);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Failed to copy link');
    }
  };

  const downloadJSON = () => {
    if (jsonData) {
      const formatted = JSON.stringify(jsonData.json, null, 2);
      const blob = new Blob([formatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jbin-${id.replace(/[^A-Za-z0-9_-]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="viewer-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-container">
        <header className="viewer-header">
          <Link to="/" className="logo-link">
            <h1>JBin</h1>
          </Link>
        </header>
        <div className="error-message">{error}</div>
        <Link to="/" className="btn btn-primary">
          Create New
        </Link>
      </div>
    );
  }

  return (
    <div className="viewer-container">
      <header className="viewer-header">
        <Link to="/" className="logo-link">
          <h1>JBin</h1>
        </Link>
        <div className="viewer-info">
          <span>ID: {id}</span>
          <span>Created: {new Date(jsonData.createdAt).toLocaleString()}</span>
        </div>
      </header>

      <div className="viewer-content">
        <div className="viewer-controls">
          <button onClick={copyToClipboard} className="btn btn-primary">
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button onClick={copyLink} className="btn btn-secondary">
            Copy Link
          </button>
          <button onClick={downloadJSON} className="btn btn-secondary">
            Download
          </button>
          <Link to="/" className="btn btn-success">
            Create New
          </Link>
        </div>

        <div className="monaco-wrapper">
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={JSON.stringify(jsonData.json, null, 2)}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 16 },
              renderLineHighlight: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Viewer;
