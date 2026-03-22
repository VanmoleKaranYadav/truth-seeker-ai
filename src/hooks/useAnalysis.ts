import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Indicator {
  type: "positive" | "negative" | "neutral";
  label: string;
  description: string;
}

interface AnalysisResult {
  credibility_score: number;
  classification: "real" | "fake" | "uncertain";
  indicators: Indicator[];
  summary: string;
  method_breakdown?: any;
}

export function useAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const analyze = async (content: string, title?: string) => {
    if (content.trim().length < 20) {
      toast({
        title: "Content too short",
        description: "Please provide at least 20 characters of text to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-news", {
        body: { content, title, user_id: user?.id },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      
      toast({
        title: "Analysis Complete",
        description: `Content classified as ${data.classification} with ${data.credibility_score}% credibility.`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return {
    isAnalyzing,
    result,
    analyze,
    reset,
  };
}
