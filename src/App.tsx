import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { AuthProvider } from './lib/auth';
import { AppQueryProvider } from './lib/query';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Reader from './pages/Reader';
import Login from './pages/Login';
import UpdatePassword from './pages/UpdatePassword';
import { ProtectedRoute } from './components/ProtectedRoute';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } }
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="w-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/" element={<ProtectedRoute><PageWrapper><Home /></PageWrapper></ProtectedRoute>} />
        <Route path="/article/:id" element={<ProtectedRoute><PageWrapper><Reader /></PageWrapper></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageWrapper><Settings /></PageWrapper></ProtectedRoute>} />
        <Route path="/update-password" element={<ProtectedRoute><PageWrapper><UpdatePassword /></PageWrapper></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppQueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
              <AnimatedRoutes />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </AppQueryProvider>
    </ThemeProvider>
  );
}

export default App;
