import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart3, Shield, GitBranch, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartQuickStart: () => void;
}

export const WelcomeModal = React.memo(function WelcomeModal({
  open,
  onClose,
  onStartQuickStart,
}: WelcomeModalProps) {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: BarChart3,
      title: 'Financial Decision Analysis',
      description: 'Unit economics, cash runway, break-even, payback, and benchmark context',
    },
    {
      icon: Shield,
      title: 'Failure Pre-Mortem',
      description: 'The failure modes, thresholds, and mitigations your plan needs',
    },
    {
      icon: GitBranch,
      title: 'Scenario Lab',
      description: 'One saved scenario set with every complimentary Decision Run',
    },
  ];

  const checklist = [
    'No card required',
    'We never fabricate numbers — we show confidence levels',
    'Five complete Decision Runs every month',
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Welcome to your decision workspace
          </DialogTitle>
          <DialogDescription className="text-base">
            Start with one decision. Quantis will show what works, what breaks, and what changes the answer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="p-2 rounded-md bg-primary/10">
                <benefit.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {benefit.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Checklist promises */}
        <div className="space-y-2 mb-4">
          {checklist.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--q-status-green, hsl(142 76% 36%))' }} />
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              onStartQuickStart();
              onClose();
            }}
            className="gap-2"
          >
            Start a Decision Run
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              navigate('/examples/coffee-shop-denver');
            }}
            className="text-sm"
          >
            See an example first
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
