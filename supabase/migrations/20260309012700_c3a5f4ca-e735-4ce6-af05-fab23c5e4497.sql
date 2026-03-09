-- Create safety evaluation table for Quantis Safety Levels (QSL) tracking
CREATE TABLE public.safety_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  safety_level INTEGER NOT NULL CHECK (safety_level >= 1 AND safety_level <= 4),
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  blocking_issues JSONB DEFAULT '[]'::jsonb,
  benchmark_versions JSONB DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata for audit trail
  evaluator_version TEXT DEFAULT '1.0.0',
  evaluation_duration_ms INTEGER,
  override_reason TEXT,
  override_by UUID
);

-- Add RLS and policies
ALTER TABLE public.safety_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own safety evaluations"
  ON public.safety_evaluations FOR SELECT
  USING (
    analysis_id IN (SELECT id FROM public.analyses WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all safety evaluations"
  ON public.safety_evaluations FOR ALL
  USING (public.is_service_role());

-- Create golden test vectors table for regression testing
CREATE TABLE public.golden_test_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type TEXT NOT NULL,
  location TEXT NOT NULL,
  input_data JSONB NOT NULL,
  expected_ranges JSONB NOT NULL,
  confidence_threshold DECIMAL(5,2) DEFAULT 70.0,
  
  -- Test execution tracking
  last_passed_at TIMESTAMP WITH TIME ZONE,
  last_failed_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  version TEXT DEFAULT '1.0.0',
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add RLS and policies for golden test vectors
ALTER TABLE public.golden_test_vectors ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage golden test vectors
CREATE POLICY "Admins can manage golden test vectors"
  ON public.golden_test_vectors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_safety_evaluations_analysis_id ON public.safety_evaluations(analysis_id);
CREATE INDEX idx_safety_evaluations_safety_level ON public.safety_evaluations(safety_level);
CREATE INDEX idx_safety_evaluations_evaluated_at ON public.safety_evaluations(evaluated_at DESC);

CREATE INDEX idx_golden_test_vectors_business_type ON public.golden_test_vectors(business_type);
CREATE INDEX idx_golden_test_vectors_location ON public.golden_test_vectors(location);
CREATE INDEX idx_golden_test_vectors_is_active ON public.golden_test_vectors(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_safety_evaluations_updated_at
    BEFORE UPDATE ON public.safety_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_golden_test_vectors_updated_at
    BEFORE UPDATE ON public.golden_test_vectors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();