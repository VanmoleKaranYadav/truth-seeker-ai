import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CredibilityMeterProps {
  score: number;
  classification: "real" | "fake" | "uncertain";
  animate?: boolean;
}

export function CredibilityMeter({ score, classification, animate = true }: CredibilityMeterProps) {
  const getColorClass = () => {
    switch (classification) {
      case "real":
        return "text-success";
      case "fake":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  const getGradient = () => {
    switch (classification) {
      case "real":
        return "from-success/20 to-success/5";
      case "fake":
        return "from-destructive/20 to-destructive/5";
      default:
        return "from-warning/20 to-warning/5";
    }
  };

  const getBorderColor = () => {
    switch (classification) {
      case "real":
        return "border-success/30";
      case "fake":
        return "border-destructive/30";
      default:
        return "border-warning/30";
    }
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center p-8 rounded-2xl border bg-gradient-to-b",
      getGradient(),
      getBorderColor()
    )}>
      <div className="relative w-40 h-40">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={getColorClass()}
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: animate ? strokeDashoffset : circumference }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={cn("text-4xl font-bold font-display", getColorClass())}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {score}%
          </motion.span>
          <span className="text-xs text-muted-foreground mt-1">Credibility</span>
        </div>
      </div>

      {/* Classification badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={cn(
          "mt-4 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wider",
          classification === "real" && "bg-success/20 text-success",
          classification === "fake" && "bg-destructive/20 text-destructive",
          classification === "uncertain" && "bg-warning/20 text-warning"
        )}
      >
        {classification === "real" && "Likely Authentic"}
        {classification === "fake" && "Likely Fake"}
        {classification === "uncertain" && "Uncertain"}
      </motion.div>
    </div>
  );
}
