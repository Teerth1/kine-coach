import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function MilestoneToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed top-6 right-6 z-50 bg-bg-glass backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-6 py-4 shadow-2xl max-w-sm"
    >
      <p className="text-white font-bold text-lg">{message}</p>
    </motion.div>
  );
}
