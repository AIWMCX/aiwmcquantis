 import React, { useEffect, useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { PartyPopper, Share2, Download, ArrowRight } from 'lucide-react';
 import { trackEvent } from '@/lib/analytics';
 
 interface FirstAnalysisCelebrationProps {
   open: boolean;
   onClose: () => void;
   onShare?: () => void;
   onExport?: () => void;
 }
 
 export const FirstAnalysisCelebration = React.memo(function FirstAnalysisCelebration({
   open,
   onClose,
   onShare,
   onExport,
 }: FirstAnalysisCelebrationProps) {
   const [showConfetti, setShowConfetti] = useState(false);
 
   useEffect(() => {
     if (open) {
       setShowConfetti(true);
       trackEvent('first_analysis_celebration_shown');
       
       // Hide confetti after animation
       const timer = setTimeout(() => setShowConfetti(false), 3000);
       return () => clearTimeout(timer);
     }
   }, [open]);
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <DialogContent className="sm:max-w-md text-center">
         <DialogHeader>
           <div className={`mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 ${showConfetti ? 'confetti-burst' : ''}`}>
             <PartyPopper className="w-8 h-8 text-success" />
           </div>
           <DialogTitle className="text-2xl font-bold">
             🎉 Your First Analysis is Complete!
           </DialogTitle>
           <DialogDescription className="text-base">
             You just saved hours of research and calculations. Here's what you can do next:
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-3 my-4">
           {onShare && (
             <Button
               variant="outline"
               onClick={() => {
                 onShare();
                 trackEvent('first_analysis_share_clicked');
               }}
               className="w-full gap-2"
             >
               <Share2 className="w-4 h-4" />
               Share with your team
             </Button>
           )}
           
           {onExport && (
             <Button
               variant="outline"
               onClick={() => {
                 onExport();
                 trackEvent('first_analysis_export_clicked');
               }}
               className="w-full gap-2"
             >
               <Download className="w-4 h-4" />
               Export as PDF
             </Button>
           )}
         </div>
 
         <Button onClick={onClose} className="w-full gap-2">
           Continue Exploring
           <ArrowRight className="w-4 h-4" />
         </Button>
 
         <p className="text-xs text-muted-foreground mt-2">
           Tip: You have 2 more free analyses this month
         </p>
       </DialogContent>
     </Dialog>
   );
 });