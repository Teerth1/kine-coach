import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login, register } = useAuth();
    const [email, setEmail] = useState('patient@kine.coach');
    const [password, setPassword] = useState('demo1234');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register(email, password, role, fullName);
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="dashboard-layout items-center justify-center gap-12 text-center relative z-10 w-full"
        >
            <div className="w-full max-w-md bg-bg-glass p-12 rounded-3xl border border-border-glass backdrop-blur-xl shadow-2xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isRegisterMode ? 'register' : 'login'}
                        initial={{ opacity: 0, x: isRegisterMode ? 30 : -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isRegisterMode ? -30 : 30 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-4xl font-black mb-2 text-white">
                            {isRegisterMode ? 'Create Account' : 'Welcome'}
                        </h2>
                        <p className="text-text-secondary mb-8">
                            {isRegisterMode ? 'Register for Kine-Coach' : 'Sign in to Kine-Coach'}
                        </p>

                        {error && (
                            <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                {error}
                            </p>
                        )}

                        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="flex flex-col gap-4 text-left">
                            {isRegisterMode && (
                                <div>
                                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full p-4 rounded-xl bg-black/40 border border-border-glass text-white focus:border-brand-blue outline-none transition-colors"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-black/40 border border-border-glass text-white focus:border-brand-blue outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-black/40 border border-border-glass text-white focus:border-brand-blue outline-none transition-colors"
                                    required
                                />
                            </div>
                            {isRegisterMode && (
                                <div>
                                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-2 block">Role</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${role === 'patient' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-black/40 border-border-glass text-text-secondary hover:border-gray-500'}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="patient"
                                                checked={role === 'patient'}
                                                onChange={() => setRole('patient')}
                                                className="hidden"
                                            />
                                            <span className="font-semibold">Patient</span>
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${role === 'provider' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-black/40 border-border-glass text-text-secondary hover:border-gray-500'}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="provider"
                                                checked={role === 'provider'}
                                                onChange={() => setRole('provider')}
                                                className="hidden"
                                            />
                                            <span className="font-semibold">Provider</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors mt-4 shadow-lg shadow-brand-blue/30"
                            >
                                {loading
                                    ? (isRegisterMode ? 'Creating Account...' : 'Authenticating...')
                                    : (isRegisterMode ? 'Register' : 'Sign In')
                                }
                            </motion.button>
                        </form>

                        <div className="mt-6">
                            <button
                                onClick={() => {
                                    setIsRegisterMode(!isRegisterMode);
                                    setError('');
                                }}
                                className="text-brand-blue hover:text-blue-400 text-sm font-semibold transition-colors"
                            >
                                {isRegisterMode
                                    ? 'Already have an account? Sign In'
                                    : "Don't have an account? Register"
                                }
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {!isRegisterMode && (
                    <div className="mt-8 pt-6 border-t border-border-glass flex flex-col gap-3">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Demo Accounts</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => { setEmail('patient@kine.coach'); setPassword('demo1234'); }}
                                className="flex-1 text-sm bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-border-glass transition-colors text-emerald-400 font-semibold"
                            >
                                Patient Demo
                            </button>
                            <button
                                onClick={() => { setEmail('provider@kine.coach'); setPassword('demo1234'); }}
                                className="flex-1 text-sm bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-border-glass transition-colors text-brand-blue font-semibold"
                            >
                                Provider Demo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
