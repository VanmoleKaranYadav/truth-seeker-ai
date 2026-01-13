-- Create table for storing news analysis history
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  credibility_score INTEGER NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 100),
  classification TEXT NOT NULL CHECK (classification IN ('real', 'fake', 'uncertain')),
  indicators JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (no auth required for this demo)
CREATE POLICY "Anyone can view analysis history" 
ON public.analysis_history 
FOR SELECT 
USING (true);

-- Create policy for public insert access
CREATE POLICY "Anyone can create analysis" 
ON public.analysis_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);