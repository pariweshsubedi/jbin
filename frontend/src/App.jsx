import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from './ConfigContext';
import { ThemeProvider } from './ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Editor from './components/Editor';
import Viewer from './components/Viewer';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <Router>
          <div className="app">
            <ThemeToggle />
            <Routes>
              <Route path="/" element={<Editor />} />
              <Route path="/:id" element={<Viewer />} />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
