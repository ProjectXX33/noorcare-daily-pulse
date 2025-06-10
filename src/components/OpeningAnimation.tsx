import React from 'react';
import { motion } from 'framer-motion';

const OpeningAnimation: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <motion.img
          src="/NQ-ICON.png"
          alt="Logo"
          className="h-24 w-24 mx-auto mb-4"
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-2xl font-bold mb-2"
        >
          Welcome to NoorHub
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-muted-foreground"
        >
          Your daily work management platform
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default OpeningAnimation; 