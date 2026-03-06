import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('patient@example.com');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="dashboard-layout items-center justify-center gap-12 text-center relative z-10 w-full"
        >
            <div className="w-full max-w-md bg-bg-glass p-12 rounded-3xl border border-border-glass backdrop-blur-xl shadow-2xl">
                <h2 className="text-4xl font-black mb-2 text-white">Welcome</h2>
                <p className="text-text-secondary mb-8">Sign in to Kine-Coach</p>

                {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}

                <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
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
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors mt-4 shadow-lg shadow-brand-blue/30"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </motion.button>
                </form>

                <div className="mt-8 pt-6 border-t border-border-glass flex flex-col gap-3">
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Demo Accounts</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setEmail('patient@example.com'); setPassword('password'); }}
                            className="flex-1 text-sm bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-border-glass transition-colors text-emerald-400 font-semibold"
                        >
                            Patient Demo
                        </button>
                        <button
                            onClick={() => { setEmail('provider@example.com'); setPassword('password'); }}
                            className="flex-1 text-sm bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-border-glass transition-colors text-brand-blue font-semibold"
                        >
                            Provider Demo
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
