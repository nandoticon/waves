import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, KeyRound, ArrowRight } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setSuccessMsg('Your password has been successfully updated.');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred while updating your password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background relative overflow-hidden">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-full max-w-md h-[400px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-sm"
            >
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm text-primary-foreground transform rotate-3">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight">
                        New password
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Enter your new secure password below to regain access to your waves.
                    </p>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-xl shadow-black/5">
                    <form onSubmit={handleUpdate} className="space-y-4">
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

                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">New Password</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading || !!successMsg}
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password || !!successMsg}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {!loading && 'Update Password'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
