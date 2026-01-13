import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  title: string | null;
  content: string;
  credibility_score: number;
  classification: "real" | "fake" | "uncertain";
  created_at: string;
}

interface HistoryCardProps {
  item: HistoryItem;
  index: number;
}

export function HistoryCard({ item, index }: HistoryCardProps) {
  const getIcon = () => {
    switch (item.classification) {
      case "real":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "fake":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getScoreColor = () => {
    switch (item.classification) {
      case "real":
        return "text-success";
      case "fake":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-card border border-border shadow-card hover:border-primary/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getIcon()}
            <span className={cn("text-sm font-medium", getScoreColor())}>
              {item.credibility_score}% Credibility
            </span>
          </div>
          <h4 className="font-medium text-foreground truncate">
            {item.title || "Untitled Analysis"}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.content.substring(0, 150)}...
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}
