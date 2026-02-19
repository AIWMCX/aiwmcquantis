import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ArrowRight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { trackCtaClick } from '@/lib/analytics';

export function ROICalculator() {
  const [analyses, setAnalyses] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(35);

  // Force en-US locale for consistent number formatting across all environments
  const fmt = (n: number) => n.toLocaleString('en-US');

  const savings = useMemo(() => {
    const consultantCost = analyses * 1500;
    const timeSaved = analyses * 4;
    const timeCostSaved = timeSaved * hourlyRate;
    const totalSavings = consultantCost + timeCostSaved;
    const quantisCost = 17;
    const netSavings = totalSavings - quantisCost;
    const roi = Math.round((netSavings / quantisCost) * 100);
    return { consultantCost, timeSaved, timeCostSaved, totalSavings, netSavings, quantisCost, roi };
  }, [analyses, hourlyRate]);

  return (
    <section className="py-12 md:py-16">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
            <Calculator className="w-4 h-4" />
            ROI Calculator
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Calculate Your Savings
          </h2>
          <p className="text-muted-foreground mt-2">See how much you save vs. hiring a consultant</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">
                    Analyses per month
                  </label>
                  <span className="text-lg font-bold text-primary">{analyses}</span>
                </div>
                <Slider
                  value={[analyses]}
                  onValueChange={([v]) => setAnalyses(v)}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How many business ideas or scenarios do you evaluate monthly?
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">
                    Your hourly rate
                  </label>
                  <span className="text-lg font-bold text-primary">${hourlyRate}/hr</span>
                </div>
                <Slider
                  value={[hourlyRate]}
                  onValueChange={([v]) => setHourlyRate(v)}
                  min={15}
                  max={250}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Your time has value — each analysis saves ~4 hours of manual research.
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Consultant Cost</p>
                  <p className="text-xl font-bold text-destructive">
                    ${fmt(savings.consultantCost)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Time Saved</p>
                  <p className="text-xl font-bold text-foreground">
                    {savings.timeSaved}h
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      (${fmt(savings.timeCostSaved)})
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-success/5 border-2 border-success/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Your Monthly Savings with Quantis</p>
                <p className="text-3xl font-black text-success">
                  ${fmt(savings.netSavings)}
                </p>
                <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Your cost: <strong className="text-foreground">$17/mo</strong></span>
                  <span>ROI: <strong className="text-success">{fmt(savings.roi)}%</strong></span>
                </div>
              </div>

              <Link
                to="/app"
                className="block"
                onClick={() => trackCtaClick('start_saving', 'roi_calculator')}
              >
                <Button size="lg" className="w-full gap-2 min-h-[52px] text-base font-semibold hover:scale-[1.02] transition-transform">
                  <DollarSign className="w-5 h-5" />
                  Start Saving ${fmt(savings.netSavings)}/Month
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
