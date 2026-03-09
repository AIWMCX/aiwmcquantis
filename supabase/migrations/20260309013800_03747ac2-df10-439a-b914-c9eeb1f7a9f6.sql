-- Create user_realism_feedback table
CREATE TABLE public.user_realism_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    realism_score INTEGER NOT NULL CHECK (realism_score >= 1 AND realism_score <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_realism_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user_realism_feedback
CREATE POLICY "Users can insert their own realism feedback"
ON public.user_realism_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));

CREATE POLICY "Users can view their own realism feedback"
ON public.user_realism_feedback
FOR SELECT
USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));

-- Allow public read access to safety_evaluations for the LastAuditedBadge
-- We check if it exists or just create it. If it fails, that's okay, but let's drop it if it exists first just in case.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'safety_evaluations' AND policyname = 'Anyone can view safety evaluations'
    ) THEN
        DROP POLICY "Anyone can view safety evaluations" ON public.safety_evaluations;
    END IF;
END
$$;

CREATE POLICY "Anyone can view safety evaluations"
ON public.safety_evaluations
FOR SELECT
USING (true);
