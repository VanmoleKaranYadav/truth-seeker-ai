import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HistoryItem {
  id: string;
  title: string | null;
  content: string;
  credibility_score: number;
  classification: "real" | "fake" | "uncertain";
  created_at: string;
}

export function useHistory() {
  return useQuery({
    queryKey: ["analysis-history"],
    queryFn: async (): Promise<HistoryItem[]> => {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching history:", error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        classification: item.classification as "real" | "fake" | "uncertain"
      }));
    },
    staleTime: 30000,
  });
}
