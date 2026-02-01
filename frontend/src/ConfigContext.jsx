import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from './config';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);

        // Load Umami analytics if configured
        if (data.analytics?.umami) {
          const script = document.createElement('script');
          script.defer = true;
          script.src = data.analytics.umami.url;
          script.setAttribute('data-website-id', data.analytics.umami.websiteId);
          document.head.appendChild(script);
        }
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setConfig({});
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
