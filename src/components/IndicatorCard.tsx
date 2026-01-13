import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Indicator {
  type: "positive" | "negative" | "neutral";
  label: string;
  description: string;
}

interface IndicatorCardProps {
  indicator: Indicator;
  index: number;
}

export function IndicatorCard({ indicator, index }: IndicatorCardProps) {
  const getIcon = () => {
    switch (indicator.type) {
      case "positive":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "negative":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertCircle className="w-5 h-5 text-warning" />;
    }
  };

  const getBorderColor = () => {
    switch (indicator.type) {
      case "positive":
        return "border-l-success";
      case "negative":
        return "border-l-destructive";
      default:
        return "border-l-warning";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 + 0.5 }}
      className={cn(
        "p-4 rounded-lg bg-card border border-border border-l-4 shadow-card",
        getBorderColor()
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{indicator.label}</h4>
          <p className="text-sm text-muted-foreground mt-1">{indicator.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
