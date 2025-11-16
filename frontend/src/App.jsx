import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Editor from './components/Editor';
import Viewer from './components/Viewer';
import './App.css';

function App() {
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
