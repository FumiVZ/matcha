import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import NotFound from './pages/NotFound';
import LiveChat from './pages/Chat';
import Search from './pages/Search';
import Recommended from './pages/Recommended';
import './App.css';
import { ToastContainer } from 'react-toastify';
// import { useWebSocket } from './hooks/useWebSocket'; // No longer needed directly here
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  // useWebSocket(); // Moved to context provider logic

  return (
    <Router>
      <WebSocketProvider>
        <div className="App">
          {/* Navigation is already inside pages or not needed globally if pages define their own layout. 
              However, typically a Layout component wraps Routes. 
              For now, I'll remove the global nav since pages have their own navs in the HTML I converted. 
              Or I can keep a minimal dev nav. Let's keep it clean or remove if it duplicates.
              The HTML pages I converted HAVE headers with Nav. Ideally I should extract Layout.
              But the request was just to convert pages.
          */}
          <ToastContainer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile/setup" element={<ProfileSetup />} />
            <Route path="/chat" element={<LiveChat />} />
            <Route path="/search" element={<Search />} />
            <Route path="/recommended" element={<Recommended />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </WebSocketProvider>
    </Router>
  );
}

export default App;
