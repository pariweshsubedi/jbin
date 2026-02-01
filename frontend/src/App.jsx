import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Editor from './components/Editor';
import Viewer from './components/Viewer';
import './App.css';

function App() {
  useEffect(() => {
    const umamiUrl = import.meta.env.VITE_UMAMI_URL;
    const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

    if (umamiUrl && umamiWebsiteId) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = umamiUrl;
      script.setAttribute('data-website-id', umamiWebsiteId);
      document.head.appendChild(script);
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Editor />} />
          <Route path="/:id" element={<Viewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
