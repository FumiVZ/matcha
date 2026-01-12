import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import NotFound from './pages/NotFound';
import './App.css';
import { ToastContainer } from 'react-toastify';
function App() {
  return (
    <Router>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
