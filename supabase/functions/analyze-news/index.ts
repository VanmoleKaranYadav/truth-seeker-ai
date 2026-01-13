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

    const systemPrompt = `You are an expert fake news detection system. Analyze the provided news content and determine its credibility.

Your task is to:
1. Assess the credibility of the news content
2. Identify specific indicators that suggest the content is real or fake
3. Provide a credibility score from 0-100 (0 = definitely fake, 100 = definitely real)
4. Classify as "real", "fake", or "uncertain"

Consider these factors:
- Sensationalist or emotional language
- Lack of credible sources or citations
- Grammatical errors or poor writing quality
- Logical inconsistencies
- Claims that are verifiable or fact-checkable
- Presence of clickbait or misleading headlines
- Writing style and professionalism
- Use of unnamed or anonymous sources`;

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
