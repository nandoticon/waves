import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Waves, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { useAuth } from '../lib/auth';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password';

export default function Login() {
    const [view, setView] = useState<AuthView>('sign_in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Prevent logged-in users from seeing the login page
    useEffect(() => {
        if (user) {
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [user, navigate, location]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            if (view === 'sign_in') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // Navigation is handled by the useEffect above when `user` becomes populated
            } else if (view === 'sign_up') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccessMsg('Registration successful! Please check your email to verify your account.');
                setView('sign_in');
                setPassword('');
            } else if (view === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password`,
                });
                if (error) throw error;
                setSuccessMsg('Password reset link sent! Check your email.');
                setView('sign_in');
                setPassword('');
            }
        } catch (err) {
            const error = err as Error;
            setErrorMsg(error.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.1 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background relative overflow-hidden">
            {/* Background design accents similar to rest of app */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-sm"
                >
                    <div className="mb-8 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm text-primary-foreground transform rotate-3">
                            <Waves className="w-6 h-6" />
                        </div>
                        <motion.h1 variants={itemVariants} className="text-3xl font-serif font-medium text-foreground tracking-tight">
                            {view === 'sign_in' && 'Welcome back'}
                            {view === 'sign_up' && 'Create an account'}
                            {view === 'forgot_password' && 'Reset password'}
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-muted-foreground mt-2 text-sm">
                            {view === 'sign_in' && 'Enter your details to sign in to your account'}
                            {view === 'sign_up' && 'Enter your email below to create your account'}
                            {view === 'forgot_password' && 'We will send you a link to reset your password'}
                        </motion.p>
                    </div>

                    <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-xl shadow-black/5">
                        <form onSubmit={handleAuth} className="space-y-4">
                            {errorMsg && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 text-sm text-red-500 bg-red-500/10 rounded-xl">
                                    {errorMsg}
                                </motion.div>
                            )}
                            {successMsg && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 text-sm text-green-500 bg-green-500/10 rounded-xl">
                                    {successMsg}
                                </motion.div>
                            )}

                            <motion.div variants={itemVariants} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                                        />
                                    </div>
                                </div>

                                {view !== 'forgot_password' && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                                            {view === 'sign_in' && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setView('forgot_password'); setErrorMsg(null); setSuccessMsg(null); }}
                                                    className="text-xs text-primary hover:underline"
                                                    disabled={loading}
                                                >
                                                    Forgot?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.button
                                variants={itemVariants}
                                type="submit"
                                disabled={loading || !email || (view !== 'forgot_password' && !password)}
                                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {view === 'sign_in' && !loading && 'Sign In'}
                                {view === 'sign_up' && !loading && 'Create Account'}
                                {view === 'forgot_password' && !loading && 'Send Reset Link'}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </motion.button>
                        </form>
                    </div>

                    <motion.div variants={itemVariants} className="mt-8 text-center text-sm text-muted-foreground">
                        {view === 'sign_in' && (
                            <p>Don't have an account? <button onClick={() => { setView('sign_up'); setErrorMsg(null); setSuccessMsg(null); }} className="text-foreground font-medium hover:underline disabled:opacity-50" disabled={loading}>Sign up</button></p>
                        )}
                        {view === 'sign_up' && (
                            <p>Already have an account? <button onClick={() => { setView('sign_in'); setErrorMsg(null); setSuccessMsg(null); }} className="text-foreground font-medium hover:underline disabled:opacity-50" disabled={loading}>Sign in</button></p>
                        )}
                        {view === 'forgot_password' && (
                            <button onClick={() => { setView('sign_in'); setErrorMsg(null); setSuccessMsg(null); }} className="flex items-center justify-center gap-2 mx-auto text-foreground font-medium hover:underline disabled:opacity-50" disabled={loading}>
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
