 import React from 'react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Sparkles, BarChart3, FileText, Zap, ArrowRight } from 'lucide-react';
 
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
   const benefits = [
     {
       icon: BarChart3,
       title: 'Financial Projections',
       description: 'ROI, payback period, revenue forecasts',
     },
     {
       icon: FileText,
       title: 'Complete Business Plan',
       description: 'Step-by-step launch roadmap',
     },
     {
       icon: Zap,
       title: 'AI-Powered Insights',
       description: 'Based on 1,000+ industry benchmarks',
     },
   ];
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader className="text-center">
           <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
             <Sparkles className="w-6 h-6 text-primary" />
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
           <Button variant="ghost" onClick={onClose} className="text-sm">
             I'll explore on my own
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 });