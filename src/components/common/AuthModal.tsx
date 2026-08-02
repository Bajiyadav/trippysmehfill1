import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, Phone, MapPin, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'signin' }) => {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(defaultTab);

  // Form states
  const [signInIdentifier, setSignInIdentifier] = useState('6301196547');
  const [signInPassword, setSignInPassword] = useState('••••••••');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    const res = await signIn(signInIdentifier, signInPassword);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message || 'Invalid credentials');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!fullName || !phone || !hostelAddress || !email || !password) {
      setErrorMsg('Please fill in all registration fields');
      return;
    }

    const res = await signUp({
      full_name: fullName,
      phone,
      hostel_address: hostelAddress,
      email,
      password
    });

    if (res.success) {
      setInfoMsg(res.message || 'Registration submitted! Waiting for Admin approval.');
      setTimeout(() => {
        setActiveTab('signin');
      }, 1500);
    } else {
      setErrorMsg(res.message || 'Registration failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#121212] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all border border-white/10 text-gray-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <h2 className="text-xl font-bold text-white font-serif tracking-wide">
            {activeTab === 'signin' ? 'Sign in' : 'Create your account'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-[#0d0d0d] border-b border-white/10">
          <button
            onClick={() => { setActiveTab('signin'); setErrorMsg(''); setInfoMsg(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'signin'
                ? 'bg-[#C5A059] text-black font-extrabold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setInfoMsg(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-[#C5A059] text-black font-extrabold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl">
              {infoMsg}
            </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email or staff username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    required
                    placeholder="e.g. nagapavankumarjavisetty@gmail.com or 6301196547"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition-all text-sm disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing In...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter full name"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Hostel / address details
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hostelAddress}
                    onChange={(e) => setHostelAddress(e.target.value)}
                    required
                    placeholder="e.g. Room 304, Campus Hostel A"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition-all text-sm disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* Social Google Login Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#121212] px-3 text-gray-500 font-medium">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-200 font-medium rounded-xl flex items-center justify-center gap-3 transition shadow-sm text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
