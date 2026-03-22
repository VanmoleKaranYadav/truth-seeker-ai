import { motion } from "framer-motion";
import { CredibilityMeter } from "./CredibilityMeter";
import { IndicatorCard } from "./IndicatorCard";
import { MethodBreakdown } from "./MethodBreakdown";
import { FileText } from "lucide-react";

interface Indicator {
  type: "positive" | "negative" | "neutral";
  label: string;
  description: string;
}

interface AnalysisResultProps {
  result: {
    credibility_score: number;
    classification: "real" | "fake" | "uncertain";
    indicators: Indicator[];
    summary: string;
    method_breakdown?: any;
  };
}

export function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Score Section */}
      <div className="flex justify-center">
        <CredibilityMeter 
          score={result.credibility_score} 
          classification={result.classification} 
        />
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="p-6 rounded-xl gradient-card border border-border shadow-card"
      >
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Analysis Summary</h3>
            <p className="text-muted-foreground leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </motion.div>

      {/* Method Breakdown */}
      {result.method_breakdown && (
        <MethodBreakdown breakdown={result.method_breakdown} />
      )}

      {/* Indicators */}
      {result.indicators && result.indicators.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Key Indicators</h3>
          <div className="space-y-3">
            {result.indicators.map((indicator, index) => (
              <IndicatorCard key={index} indicator={indicator} index={index} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
