// // src/App.jsx
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import LandingPage        from "./Pages_Temp/LandingPages";
// import Dashboard          from "./Pages_Temp/Dashboard";
// import ProtectedRoute     from "./Pages_Temp/ProtectedRoute";
// import ResetPasswordPage  from "./Pages_Temp/ResetPasswordPage";

// function App() {
//   return (
//     <Router>
//       <Routes>
//         {/* Public landing page — hosts auth modals, handles ?verified=true */}
//         <Route path="/"                element={<LandingPage />} />

//         {/* Password reset page — linked from email */}
//         <Route path="/reset-password"  element={<ResetPasswordPage />} />

//         {/* Protected dashboard */}
//         <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

//         {/* Catch-all */}
//         <Route path="*"                element={<LandingPage />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage        from "./Pages_Temp/LandingPages";
import Dashboard          from "./Pages_Temp/Dashboard";
import ProtectedRoute     from "./Pages_Temp/ProtectedRoute";
import ResetPasswordPage  from "./Pages_Temp/ResetPasswordPage";
import { PremiumProvider } from "./context/PremiumContext";

function App() {
  return (
    // PremiumProvider wraps everything so usePremium() works in any component
    <PremiumProvider>
      <Router>
        <Routes>
          {/* Public landing page — hosts auth modals, handles ?verified=true */}
          <Route path="/"               element={<LandingPage />} />

          {/* Password reset page — linked from email */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected dashboard — PremiumProvider already covers this */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </PremiumProvider>
  );
}

export default App;
