import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2800; // ~2.8 seconds
    const intervalTime = 35;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-4 text-center select-none overflow-hidden"
      >
        {/* Ambient background glows */}
        <div className="absolute w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-3xl -top-20 -left-20 pointer-events-none animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Logo Container with 3D Ring Animation */}
        <div className="relative mb-6">
          {/* Rotating halo ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400/40 pointer-events-none"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            className="absolute -inset-2 rounded-full border border-blue-500/30 pointer-events-none"
          />

          {/* Logo badge image */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.45)] ring-4 ring-cyan-500/30 bg-slate-900 flex items-center justify-center"
          >
            <img
              src="/logo.png"
              alt="WAQAR WEBSITE INQUIRY Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback elegant SVG logo if image load fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback stylized monogram if image doesn't render */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 -z-10">
              <span className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white">W</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mt-1">WAQAR WEBSITE INQUIRY</span>
            </div>
          </motion.div>
        </div>

        {/* Brand Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-2 max-w-md"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/20 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Official Inquiry Management Suite</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            WAQAR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">WEBSITE INQUIRY</span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 font-medium">
            "Manage Every Inquiry. Every Call. Every Customer."
          </p>
        </motion.div>

        {/* Progress Bar & Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 w-64 max-w-xs space-y-2"
        >
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-400 h-full rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(56,189,248,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>Loading System...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </motion.div>

        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onComplete}
          className="mt-6 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 px-3 rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <span>Skip to Dashboard</span>
          <ArrowRight className="w-3 h-3" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};
