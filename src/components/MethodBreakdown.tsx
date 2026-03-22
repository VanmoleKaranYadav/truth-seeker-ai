import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Brain, FileText, Globe, BarChart3 } from "lucide-react";

interface MethodBreakdownProps {
  breakdown: {
    tfidf: { score: number; weight: number; details: Record<string, number> };
    sourceReputation: { score: number; weight: number; sourcesFound: { name: string; score: number; tier: string }[] };
    aiModels: { model: string; score: number; classification: string }[];
    aiConsensus: { score: number; weight: number; modelsUsed: number };
  };
}

const DETAIL_LABELS: Record<string, string> = {
  clickbaitScore: "Clickbait Detection",
  sensationalismScore: "Sensationalism",
  readabilityScore: "Readability",
  attributionScore: "Source Attribution",
  capsScore: "CAPS Usage",
  punctuationScore: "Punctuation",
};

function ScoreBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
  const color = score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function MethodBreakdown({ breakdown }: MethodBreakdownProps) {
  const methods = [
    {
      icon: Brain,
      title: "AI Multi-Model Consensus",
      subtitle: `${breakdown.aiConsensus.modelsUsed} models • ${breakdown.aiConsensus.weight}% weight`,
      score: breakdown.aiConsensus.score,
      children: breakdown.aiModels.map((m, i) => (
        <div key={m.model} className="flex items-center justify-between text-xs py-1">
          <span className="text-muted-foreground">{m.model}</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase",
              m.classification === "real" && "bg-success/20 text-success",
              m.classification === "fake" && "bg-destructive/20 text-destructive",
              m.classification === "uncertain" && "bg-warning/20 text-warning",
            )}>{m.classification}</span>
            <span className="font-medium text-foreground">{m.score}%</span>
          </div>
        </div>
      )),
    },
    {
      icon: BarChart3,
      title: "TF-IDF Text Analysis",
      subtitle: `Statistical NLP • ${breakdown.tfidf.weight}% weight`,
      score: breakdown.tfidf.score,
      children: Object.entries(breakdown.tfidf.details).map(([key, val], i) => (
        <ScoreBar key={key} label={DETAIL_LABELS[key] || key} score={val as number} delay={0.1 * i} />
      )),
    },
    {
      icon: Globe,
      title: "Source Reputation",
      subtitle: `Known source database • ${breakdown.sourceReputation.weight}% weight`,
      score: breakdown.sourceReputation.score,
      children: breakdown.sourceReputation.sourcesFound.length > 0 ? (
        breakdown.sourceReputation.sourcesFound.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-xs py-1">
            <span className="capitalize text-muted-foreground">{s.name}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium",
              s.score >= 70 ? "bg-success/20 text-success" : s.score >= 40 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"
            )}>{s.tier} • {s.score}/100</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground italic">No recognized sources detected — neutral score applied</p>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Analysis Methods Breakdown
      </h3>
      <div className="grid gap-4">
        {methods.map((method, i) => (
          <motion.div
            key={method.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.15 }}
            className="p-4 rounded-xl gradient-card border border-border shadow-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <method.icon className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{method.title}</p>
                  <p className="text-[11px] text-muted-foreground">{method.subtitle}</p>
                </div>
              </div>
              <span className={cn(
                "text-lg font-bold font-display",
                method.score >= 70 ? "text-success" : method.score >= 40 ? "text-warning" : "text-destructive"
              )}>{method.score}%</span>
            </div>
            <div className="space-y-2 pl-6">
              {method.children}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
