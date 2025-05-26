
import React from 'react';
import { Brain, MapPin, Send, Loader2 } from 'lucide-react';

interface AnalysisInputFormProps {
  idea: string;
  location: string;
  loading: boolean;
  isFormValid: boolean;
  onIdeaChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AnalysisInputForm: React.FC<AnalysisInputFormProps> = ({
  idea,
  location,
  loading,
  isFormValid,
  onIdeaChange,
  onLocationChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="w-full section-card mb-12 space-y-6">
      <div>
        <label htmlFor="idea" className="block text-sm font-medium mb-1 ml-1">Ваша бизнес-идея</label>
        <div className="relative">
          <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            id="idea"
            value={idea}
            onChange={(e) => onIdeaChange(e.target.value)}
            placeholder="Например, AI агентство для стартапов"
            className="input-field pl-10"
            disabled={loading}
          />
        </div>
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1 ml-1">Страна или город</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Например, США или Кремниевая долина"
            className="input-field pl-10"
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!isFormValid || loading}
        className="btn btn-primary w-full text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Анализируем...
          </>
        ) : (
          <>
            Рассчитать
            <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
};

export default AnalysisInputForm;
