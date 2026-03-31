import React from 'react';
import { LogIn } from 'lucide-react';

const Login = () => {
  const handleLogin = () => {
    // This sends the user to your Node.js server to start the Google flow
    window.location.href = 'http://localhost:9090/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center border border-gray-100">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <LogIn size={40} className="text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-500 mb-8">Securely sync your notes across all your devices.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 px-4 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;