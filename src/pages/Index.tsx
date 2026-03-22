import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, History, ArrowRight, Sparkles, RotateCcw, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisResult } from "@/components/AnalysisResult";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { HistoryCard } from "@/components/HistoryCard";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useHistory } from "@/hooks/useHistory";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  
  const { isAnalyzing, result, analyze, reset } = useAnalysis();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useHistory();

  const handleAnalyze = () => {
    analyze(content, title);
  };

  const handleReset = () => {
    reset();
    setTitle("");
    setContent("");
    refetchHistory();
  };

  return (
    <div className="min-h-screen gradient-hero">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] gradient-glow opacity-50" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Fake News <span className="text-gradient">Detector</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            AI-powered content analysis to verify news credibility and identify misinformation
          </p>
        </motion.header>

        {/* Toggle between analyze and history */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-2 mb-8"
        >
          <Button
            variant={!showHistory ? "default" : "secondary"}
            onClick={() => setShowHistory(false)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Analyze
          </Button>
          <Button
            variant={showHistory ? "default" : "secondary"}
            onClick={() => setShowHistory(true)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h2 className="font-display text-xl font-semibold text-foreground">Recent Analyses</h2>
              {historyLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading history...</div>
              ) : history && history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <HistoryCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No analyses yet. Start by analyzing some content!
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {isAnalyzing ? (
                <div className="rounded-2xl gradient-card border border-border shadow-card">
                  <LoadingAnalysis />
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <AnalysisResult result={result} />
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex justify-center"
                  >
                    <Button onClick={handleReset} variant="secondary" className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Analyze Another
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="rounded-2xl gradient-card border border-border shadow-card p-6 md:p-8">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                          Article Title <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter the headline or title..."
                          className="bg-muted/50 border-border focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
                          News Content <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Paste the news article or content you want to verify..."
                          className="min-h-[200px] bg-muted/50 border-border focus:border-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Minimum 20 characters required
                        </p>
                      </div>

                      <Button 
                        onClick={handleAnalyze}
                        disabled={content.trim().length < 20}
                        className="w-full gap-2 h-12 text-base font-medium"
                      >
                        Analyze Content
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { icon: "🔍", title: "Deep Analysis", desc: "AI examines writing style, sources, and factual claims" },
                      { icon: "📊", title: "Credibility Score", desc: "Get a 0-100 rating based on multiple indicators" },
                      { icon: "🛡️", title: "Key Indicators", desc: "See what signals suggest real or fake content" },
                    ].map((feature, i) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="p-4 rounded-xl bg-card/50 border border-border text-center"
                      >
                        <div className="text-2xl mb-2">{feature.icon}</div>
                        <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center text-sm text-muted-foreground"
        >
          <p>
            Powered by AI • Results are for informational purposes only
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
