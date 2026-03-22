import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── TF-IDF TEXT ANALYSIS ───────────────────────────────────────────────────

const CLICKBAIT_PATTERNS = [
  /you won'?t believe/i, /shocking/i, /mind.?blowing/i, /this is why/i,
  /what happens next/i, /\b(exposed|busted|destroyed|slammed)\b/i,
  /they don'?t want you to know/i, /one weird trick/i, /gone wrong/i,
  /breaking:?\s/i, /urgent:?\s/i, /exclusive:?\s/i,
];

const SENSATIONAL_WORDS = new Set([
  "shocking", "unbelievable", "horrifying", "devastating", "explosive",
  "bombshell", "outrageous", "insane", "terrifying", "nightmare",
  "crisis", "catastrophe", "scandal", "conspiracy", "coverup",
  "exposed", "busted", "slammed", "destroyed", "obliterated",
]);

const HEDGING_WORDS = new Set([
  "allegedly", "reportedly", "according to", "sources say", "may",
  "might", "could", "possibly", "purportedly", "claimed",
]);

const ATTRIBUTION_PATTERNS = [
  /according to [\w\s]+/gi,
  /\b(said|stated|confirmed|reported|announced)\b/gi,
  /\b(dr\.|prof\.|professor|minister|secretary|spokesperson)\b/gi,
  /"[^"]{10,}"/g, // quoted speech
];

function computeTfIdf(text: string): Record<string, number> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const tf: Record<string, number> = {};
  for (const w of words) tf[w] = (tf[w] || 0) + 1;
  const total = words.length || 1;
  for (const w in tf) tf[w] /= total;
  return tf;
}

function analyzeTextStatistics(content: string, title: string): {
  score: number;
  details: {
    clickbaitScore: number;
    sensationalismScore: number;
    readabilityScore: number;
    attributionScore: number;
    capsScore: number;
    punctuationScore: number;
  };
} {
  const fullText = `${title} ${content}`;
  const words = fullText.split(/\s+/);
  const wordCount = words.length || 1;
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Clickbait detection
  const clickbaitMatches = CLICKBAIT_PATTERNS.filter(p => p.test(fullText)).length;
  const clickbaitScore = Math.max(0, 100 - clickbaitMatches * 25);

  // Sensationalism via TF-IDF
  const tfidf = computeTfIdf(fullText);
  let sensationalCount = 0;
  for (const word of Object.keys(tfidf)) {
    if (SENSATIONAL_WORDS.has(word)) sensationalCount++;
  }
  const sensationalismScore = Math.max(0, 100 - (sensationalCount / wordCount) * 5000);

  // Readability (Flesch-like approximation)
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllables = words.reduce((sum, w) => sum + Math.max(1, w.replace(/[^aeiouy]/gi, "").length), 0) / wordCount;
  const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllables;
  const readabilityScore = Math.min(100, Math.max(0, fleschScore));

  // Attribution quality
  let attributionMatches = 0;
  for (const p of ATTRIBUTION_PATTERNS) {
    const m = fullText.match(p);
    if (m) attributionMatches += m.length;
  }
  const attributionScore = Math.min(100, attributionMatches * 15);

  // Excessive CAPS
  const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase()).length;
  const capsScore = Math.max(0, 100 - (capsWords / wordCount) * 500);

  // Excessive punctuation
  const excessivePunctuation = (fullText.match(/[!?]{2,}/g) || []).length;
  const punctuationScore = Math.max(0, 100 - excessivePunctuation * 20);

  const overallScore = Math.round(
    clickbaitScore * 0.2 +
    sensationalismScore * 0.2 +
    readabilityScore * 0.15 +
    attributionScore * 0.25 +
    capsScore * 0.1 +
    punctuationScore * 0.1
  );

  return {
    score: Math.min(100, Math.max(0, overallScore)),
    details: {
      clickbaitScore: Math.round(clickbaitScore),
      sensationalismScore: Math.round(sensationalismScore),
      readabilityScore: Math.round(readabilityScore),
      attributionScore: Math.round(attributionScore),
      capsScore: Math.round(capsScore),
      punctuationScore: Math.round(punctuationScore),
    },
  };
}

// ─── SOURCE REPUTATION DATABASE ─────────────────────────────────────────────

const SOURCE_REPUTATION: Record<string, { score: number; tier: string }> = {
  "reuters": { score: 95, tier: "Tier 1" },
  "associated press": { score: 95, tier: "Tier 1" },
  "ap news": { score: 95, tier: "Tier 1" },
  "bbc": { score: 90, tier: "Tier 1" },
  "npr": { score: 90, tier: "Tier 1" },
  "the new york times": { score: 88, tier: "Tier 1" },
  "washington post": { score: 87, tier: "Tier 1" },
  "the guardian": { score: 85, tier: "Tier 1" },
  "cnn": { score: 75, tier: "Tier 2" },
  "fox news": { score: 65, tier: "Tier 2" },
  "msnbc": { score: 70, tier: "Tier 2" },
  "al jazeera": { score: 80, tier: "Tier 2" },
  "the economist": { score: 90, tier: "Tier 1" },
  "nature": { score: 95, tier: "Tier 1" },
  "science": { score: 95, tier: "Tier 1" },
  "buzzfeed": { score: 50, tier: "Tier 3" },
  "daily mail": { score: 40, tier: "Tier 3" },
  "infowars": { score: 5, tier: "Unreliable" },
  "breitbart": { score: 30, tier: "Tier 3" },
  "the onion": { score: 10, tier: "Satire" },
  "babylon bee": { score: 10, tier: "Satire" },
};

function checkSourceReputation(content: string, title: string): {
  score: number;
  sourcesFound: { name: string; score: number; tier: string }[];
} {
  const text = `${title} ${content}`.toLowerCase();
  const found: { name: string; score: number; tier: string }[] = [];

  for (const [name, info] of Object.entries(SOURCE_REPUTATION)) {
    if (text.includes(name)) {
      found.push({ name, ...info });
    }
  }

  if (found.length === 0) {
    return { score: 50, sourcesFound: [] }; // Neutral if no known sources
  }

  const avgScore = Math.round(found.reduce((s, f) => s + f.score, 0) / found.length);
  return { score: avgScore, sourcesFound: found };
}

// ─── AI ANALYSIS (Multi-Model) ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert fake news detection system with training in journalism, fact-checking, and media literacy. Analyze news content with rigorous, evidence-based methodology.

## ANALYSIS FRAMEWORK

### 1. SOURCE & ATTRIBUTION (Weight: 25%)
- Named, specific, verifiable sources?
- Quotes attributed to real people?
- Official documents/studies/data cited?
- Red flags: "sources say", anonymous tipsters

### 2. LANGUAGE & RHETORIC (Weight: 20%)
- Emotional manipulation, loaded words, ALL CAPS
- One-sided presentation, conspiracy appeals

### 3. FACTUAL CONSISTENCY (Weight: 25%)
- Internal contradictions, misrepresented stats
- Cherry-picked info, opinion as fact

### 4. STRUCTURAL INTEGRITY (Weight: 15%)
- Professional structure, grammar, balanced views

### 5. CONTEXTUAL SIGNALS (Weight: 15%)
- Timeliness, plausibility, multi-outlet reporting

## SCORING: 80-100 High | 60-79 Moderate | 40-59 Uncertain | 20-39 Low | 0-19 Very Low

## RULES
- Be conservative: lean toward "uncertain" when unsure
- Distinguish bias from misinformation
- Satire = "uncertain" with note
- Political bias alone ≠ fake`;

async function callAiModel(
  apiKey: string,
  model: string,
  content: string,
  title: string
): Promise<{ credibility_score: number; classification: string; indicators: any[]; summary: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this news:\n\nTitle: ${title || "No title"}\n\nContent:\n${content}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_news",
          description: "Return analysis results",
          parameters: {
            type: "object",
            properties: {
              credibility_score: { type: "number", description: "0-100" },
              classification: { type: "string", enum: ["real", "fake", "uncertain"] },
              indicators: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["positive", "negative", "neutral"] },
                    label: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["type", "label", "description"],
                },
              },
              summary: { type: "string" },
            },
            required: ["credibility_score", "classification", "indicators", "summary"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "analyze_news" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`AI model ${model} failed with status ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error(`Invalid response from ${model}`);
  return JSON.parse(toolCall.function.arguments);
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, user_id } = await req.json();

    if (!content || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide at least 20 characters of text to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const titleStr = title || "No title provided";

    // ── Run all analyses in parallel ──
    const [tfidfResult, sourceResult, model1Result, model2Result] = await Promise.allSettled([
      // 1. TF-IDF (instant)
      Promise.resolve(analyzeTextStatistics(content, titleStr)),
      // 2. Source reputation (instant)
      Promise.resolve(checkSourceReputation(content, titleStr)),
      // 3. Gemini analysis
      callAiModel(LOVABLE_API_KEY, "google/gemini-3-flash-preview", content, titleStr),
      // 4. GPT-5 analysis
      callAiModel(LOVABLE_API_KEY, "openai/gpt-5-mini", content, titleStr),
    ]);

    // Extract results with fallbacks
    const tfidf = tfidfResult.status === "fulfilled" ? tfidfResult.value : { score: 50, details: {} };
    const source = sourceResult.status === "fulfilled" ? sourceResult.value : { score: 50, sourcesFound: [] };

    const aiResults = [];
    if (model1Result.status === "fulfilled") aiResults.push({ model: "Gemini", ...model1Result.value });
    if (model2Result.status === "fulfilled") aiResults.push({ model: "GPT-5", ...model2Result.value });

    if (aiResults.length === 0) {
      // Handle rate limit / credit errors
      const err = model1Result.status === "rejected" ? model1Result.reason : model2Result.status === "rejected" ? model2Result.reason : null;
      if (err?.message === "RATE_LIMITED") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err?.message === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Both AI models failed");
    }

    // ── Compute consensus score ──
    const aiAvgScore = Math.round(aiResults.reduce((s, r) => s + r.credibility_score, 0) / aiResults.length);

    // Weighted final score: AI 50%, TF-IDF 25%, Source Rep 25%
    const finalScore = Math.round(
      aiAvgScore * 0.50 +
      tfidf.score * 0.25 +
      source.score * 0.25
    );

    // Consensus classification
    const classifications = aiResults.map(r => r.classification);
    let finalClassification: string;
    if (classifications.every(c => c === "real") && finalScore >= 60) {
      finalClassification = "real";
    } else if (classifications.every(c => c === "fake") && finalScore < 40) {
      finalClassification = "fake";
    } else if (finalScore >= 70) {
      finalClassification = "real";
    } else if (finalScore <= 30) {
      finalClassification = "fake";
    } else {
      finalClassification = "uncertain";
    }

    // Merge indicators (deduplicate by label)
    const allIndicators: any[] = [];
    const seenLabels = new Set<string>();
    for (const r of aiResults) {
      for (const ind of r.indicators || []) {
        if (!seenLabels.has(ind.label)) {
          seenLabels.add(ind.label);
          allIndicators.push(ind);
        }
      }
    }

    // Add TF-IDF indicators
    if (tfidf.details.clickbaitScore !== undefined && tfidf.details.clickbaitScore < 50) {
      allIndicators.push({ type: "negative", label: "Clickbait Patterns", description: "Text analysis detected clickbait language patterns" });
    }
    if (tfidf.details.sensationalismScore !== undefined && tfidf.details.sensationalismScore < 50) {
      allIndicators.push({ type: "negative", label: "Sensationalist Language", description: "TF-IDF analysis found high frequency of sensationalist words" });
    }
    if (tfidf.details.attributionScore !== undefined && tfidf.details.attributionScore > 60) {
      allIndicators.push({ type: "positive", label: "Good Source Attribution", description: "Text contains proper attribution and quotes" });
    }

    // Add source reputation indicators
    for (const s of source.sourcesFound) {
      allIndicators.push({
        type: s.score >= 70 ? "positive" : s.score >= 40 ? "neutral" : "negative",
        label: `Source: ${s.name}`,
        description: `${s.tier} source with ${s.score}/100 reputation score`,
      });
    }

    // Build method breakdown
    const methodBreakdown = {
      tfidf: { score: tfidf.score, weight: 25, details: tfidf.details },
      sourceReputation: { score: source.score, weight: 25, sourcesFound: source.sourcesFound },
      aiModels: aiResults.map(r => ({
        model: r.model,
        score: r.credibility_score,
        classification: r.classification,
      })),
      aiConsensus: { score: aiAvgScore, weight: 50, modelsUsed: aiResults.length },
    };

    const summary = aiResults[0]?.summary || "Analysis completed using multiple methods.";

    const result = {
      credibility_score: finalScore,
      classification: finalClassification,
      indicators: allIndicators,
      summary,
      method_breakdown: methodBreakdown,
    };

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from("analysis_history")
      .insert({
        title: title || null,
        content: content.substring(0, 5000),
        credibility_score: finalScore,
        classification: finalClassification,
        indicators: allIndicators,
      });

    if (dbError) console.error("Database error:", dbError);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error analyzing news:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to analyze content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
