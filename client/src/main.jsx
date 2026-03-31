import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PremiumProvider } from "./context/PremiumContext";  // ✅ fixed path

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PremiumProvider>
      <App />
    </PremiumProvider>
  </React.StrictMode>
)
