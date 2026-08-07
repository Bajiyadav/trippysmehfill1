import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, User, Phone, MapPin, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'register';
  onRegisterSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'signin',
  onRegisterSuccess
}) => {
  const { signIn, signUp, resetPassword, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot_password'>(defaultTab);

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Sync default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg('');
      setInfoMsg('');
    }
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      setInfoMsg('Signed in successfully!');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setErrorMsg(result.message || 'Invalid email or password.');
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Mobile Number is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      hostel_address: hostelAddress.trim(),
      password
    });
    setIsSubmitting(false);

    if (result.success) {
      setInfoMsg(result.message || 'Account created successfully!');
      if (user && onRegisterSuccess) {
        onRegisterSuccess(user);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setErrorMsg(result.message || 'Registration failed. Please check your inputs.');
    }
  };

  // Handle Password Reset Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      setInfoMsg(result.message || 'Password reset link sent to your email!');
    } else {
      setErrorMsg(result.message || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 text-gray-200 relative">

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
          <div className="flex items-center gap-2">
            {activeTab === 'forgot_password' && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="p-1 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-extrabold text-white font-serif tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
                <span>
                  {activeTab === 'signin'
                    ? 'Sign In to Account'
                    : activeTab === 'register'
                    ? 'Create New Account'
                    : 'Reset Password'}
                </span>
              </h2>
              <p className="text-xs text-gray-400">Trippy's Mehfill ERP Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Sign Up) */}
        {activeTab !== 'forgot_password' && (
          <div className="flex border-b border-white/10 bg-[#0a0a0a]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'signin'
                  ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/5'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'register'
                  ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/5'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mx-5 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-green-400">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN FORM */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot_password');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="text-[11px] text-[#C5A059] hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] disabled:opacity-50 text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleSignUpSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Baji Yadav"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Mobile Number (for Delivery & Contact) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white font-mono placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Hostel / Delivery Address <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={hostelAddress}
                  onChange={(e) => setHostelAddress(e.target.value)}
                  placeholder="GD Goenka Campus, Block B Room 204"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] disabled:opacity-50 text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {activeTab === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="p-6 space-y-4">
            <p className="text-xs text-gray-400">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#181818] border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] disabled:opacity-50 text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
