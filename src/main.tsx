
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set favicon dynamically
const setFavicon = () => {
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90" x="50%" text-anchor="middle">📋</text></svg>';
  document.head.appendChild(favicon);
  
  // Also set the title
  document.title = "NoorCare Employee System";
};

// Call the function to set favicon
setFavicon();

createRoot(document.getElementById("root")!).render(<App />);
