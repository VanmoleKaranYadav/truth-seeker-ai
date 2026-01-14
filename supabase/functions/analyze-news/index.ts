import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title } = await req.json();
    
    if (!content || content.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide at least 20 characters of text to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert fake news detection system with training in journalism, fact-checking, and media literacy. Analyze news content with rigorous, evidence-based methodology.

## ANALYSIS FRAMEWORK

### 1. SOURCE & ATTRIBUTION ANALYSIS (Weight: 25%)
- Are sources named, specific, and verifiable?
- Are quotes attributed to real, identifiable people?
- Does it cite official documents, studies, or data?
- Red flags: "sources say", "experts claim", "people are saying", anonymous tipsters

### 2. LANGUAGE & RHETORIC ANALYSIS (Weight: 20%)
- Emotional manipulation: fear, outrage, urgency without justification
- Loaded words: "shocking", "you won't believe", "they don't want you to know"
- ALL CAPS, excessive punctuation, hyperbole
- One-sided presentation without acknowledging complexity
- Appeals to conspiracy or hidden agendas

### 3. FACTUAL CONSISTENCY (Weight: 25%)
- Internal contradictions in the narrative
- Claims that contradict well-established facts
- Misrepresentation of statistics or data
- Cherry-picked information without context
- Verifiable claims vs. opinion presented as fact

### 4. STRUCTURAL INTEGRITY (Weight: 15%)
- Professional journalism structure (inverted pyramid, who/what/when/where/why)
- Proper grammar, spelling, punctuation
- Clear distinction between news and opinion
- Balanced presentation of multiple viewpoints
- Appropriate use of hedging language for unconfirmed info

### 5. CONTEXTUAL SIGNALS (Weight: 15%)
- Timeliness and relevance
- Geographic and temporal specificity
- Consistency with known current events
- Plausibility of the claims made
- Whether the story has been reported by multiple outlets

## SCORING GUIDELINES
- 80-100: High credibility - Professional journalism standards, verifiable sources, balanced reporting
- 60-79: Moderate credibility - Some concerns but generally factual, may lack full sourcing
- 40-59: Uncertain - Mixed signals, needs fact-checking, could be opinion disguised as news
- 20-39: Low credibility - Multiple red flags, unverified claims, manipulative language
- 0-19: Very low credibility - Clear misinformation markers, fabricated or heavily distorted

## IMPORTANT RULES
- Be conservative: when uncertain, lean toward "uncertain" classification
- Distinguish between: factual errors, bias, satire, opinion, and deliberate misinformation
- Consider that even legitimate news can have errors; look for patterns, not isolated issues
- Satire should be classified as "uncertain" with a note, not "fake"
- Political bias alone doesn't make something fake; look for factual accuracy`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this news content:\n\nTitle: ${title || "No title provided"}\n\nContent:\n${content}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_news",
              description: "Return the analysis results for the news content",
              parameters: {
                type: "object",
                properties: {
                  credibility_score: {
                    type: "number",
                    description: "Credibility score from 0-100"
                  },
                  classification: {
                    type: "string",
                    enum: ["real", "fake", "uncertain"],
                    description: "Overall classification of the news"
                  },
                  indicators: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["positive", "negative", "neutral"],
                          description: "Whether this indicator suggests real or fake news"
                        },
                        label: {
                          type: "string",
                          description: "Short label for the indicator"
                        },
                        description: {
                          type: "string",
                          description: "Detailed explanation of the indicator"
                        }
                      },
                      required: ["type", "label", "description"]
                    },
                    description: "List of indicators found in the content"
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of the analysis"
                  }
                },
                required: ["credibility_score", "classification", "indicators", "summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_news" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze content");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Invalid response from AI");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from("analysis_history")
      .insert({
        title: title || null,
        content: content.substring(0, 5000), // Limit content length
        credibility_score: analysisResult.credibility_score,
        classification: analysisResult.classification,
        indicators: analysisResult.indicators
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue anyway, the analysis still succeeded
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing news:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to analyze content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
