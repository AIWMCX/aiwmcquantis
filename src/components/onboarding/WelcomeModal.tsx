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
import { BarChart3, Shield, Receipt, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

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
      title: 'BI Report',
      description: 'Revenue forecasts, unit economics, benchmark percentiles',
    },
    {
      icon: Shield,
      title: 'Pre-Mortem Analysis',
      description: 'Failure scenarios, risk flags, mitigation plans',
    },
    {
      icon: Receipt,
      title: 'Invoice Capacity',
      description: 'Credit capacity, margin health, payment risk',
    },
  ];

  const checklist = [
    'No card required',
    'We never fabricate numbers — we show confidence levels',
    'You can save and edit every assumption later',
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Welcome to Quantis!
          </DialogTitle>
          <DialogDescription className="text-base">
            Get complete business analysis in under 2 minutes
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
            Get Started
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
