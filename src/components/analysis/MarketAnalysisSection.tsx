import React from 'react';
import { PieChart, TrendingUp, Users, Shield, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MarketAnalysis } from '@/types/analysis';

interface MarketAnalysisSectionProps {
  market: MarketAnalysis;
}

export function MarketAnalysisSection({ market }: MarketAnalysisSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="w-5 h-5 text-primary" />
          Market Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Size */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <PieChart className="w-4 h-4 text-muted-foreground" />
            Market Size
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">TAM</p>
              <p className="text-sm font-medium text-foreground">{market.market_size.tam}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">SAM</p>
              <p className="text-sm font-medium text-foreground">{market.market_size.sam}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/20 border border-primary/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">SOM</p>
              <p className="text-sm font-medium text-primary">{market.market_size.som}</p>
            </div>
          </div>
        </div>

        {/* Trends */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Market Trends
          </h4>
          <div className="flex flex-wrap gap-2">
            {market.trends.map((trend, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {trend}
              </Badge>
            ))}
          </div>
        </div>

        {/* Competition */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Competition
          </h4>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Main Competitors</p>
              <div className="space-y-2">
                {market.competition.main_competitors.map((competitor, index) => {
                  // Handle both string and object formats
                  if (typeof competitor === 'string') {
                    return (
                      <Badge key={index} variant="outline" className="text-xs">
                        {competitor}
                      </Badge>
                    );
                  }
                  // Object format with name, strengths, weaknesses
                  return (
                    <div key={index} className="p-2 rounded-lg bg-muted/20 border border-border/50">
                      <p className="text-sm font-medium text-foreground">{competitor.name}</p>
                      {competitor.strengths && (
                        <p className="text-xs text-muted-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400">+</span> {competitor.strengths}
                        </p>
                      )}
                      {competitor.weaknesses && (
                        <p className="text-xs text-muted-foreground">
                          <span className="text-red-600 dark:text-red-400">−</span> {competitor.weaknesses}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">{market.competition.competitive_landscape}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium">Market Gaps</p>
              <p className="text-sm text-foreground">{market.competition.market_gaps}</p>
            </div>
          </div>
        </div>

        {/* Barriers */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Barriers to Entry
          </h4>
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
            {market.barriers_to_entry}
          </p>
        </div>

        {/* Growth Opportunities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Rocket className="w-4 h-4 text-muted-foreground" />
            Growth Opportunities
          </h4>
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-primary/5 border border-primary/20">
            {market.growth_opportunities}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
