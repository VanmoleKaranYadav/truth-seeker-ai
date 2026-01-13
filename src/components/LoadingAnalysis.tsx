import { motion } from "framer-motion";
import { Search, Brain, Shield, FileSearch } from "lucide-react";

const steps = [
  { icon: FileSearch, label: "Parsing content..." },
  { icon: Brain, label: "Analyzing patterns..." },
  { icon: Search, label: "Checking indicators..." },
  { icon: Shield, label: "Generating report..." },
];

export function LoadingAnalysis() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Animated scanner */}
      <div className="relative w-32 h-32 mb-8">
        <motion.div
          className="absolute inset-0 border-4 border-primary/30 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-4 border-4 border-primary/50 rounded-full"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
          className="absolute inset-8 bg-primary/20 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Brain className="w-8 h-8 text-primary" />
        </motion.div>
        
        {/* Scanning line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.5 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.9, 1, 0.9]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: index * 0.5,
                ease: "easeInOut"
              }}
              className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <step.icon className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm text-muted-foreground">{step.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="mt-8 text-sm text-muted-foreground text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        AI is analyzing your content...
      </motion.p>
    </div>
  );
}
