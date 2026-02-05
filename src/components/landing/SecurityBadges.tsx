 import React from 'react';
 import { Shield, Lock, Eye, Server } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface SecurityBadgesProps {
   className?: string;
   variant?: 'horizontal' | 'vertical' | 'compact';
 }
 
 const badges = [
   {
     icon: Lock,
     label: '256-bit SSL',
     description: 'Bank-grade encryption',
   },
   {
     icon: Eye,
     label: 'GDPR Compliant',
     description: 'Your data stays private',
   },
   {
     icon: Shield,
     label: 'SOC 2 Ready',
     description: 'Enterprise security',
   },
   {
     icon: Server,
     label: 'EU Data Centers',
     description: 'Data never leaves EU',
   },
 ];
 
 export const SecurityBadges = React.memo(function SecurityBadges({
   className,
   variant = 'horizontal',
 }: SecurityBadgesProps) {
   if (variant === 'compact') {
     return (
       <div className={cn('flex items-center gap-4 text-xs text-muted-foreground', className)}>
         {badges.slice(0, 3).map((badge) => (
           <div key={badge.label} className="flex items-center gap-1.5">
             <badge.icon className="w-3.5 h-3.5" />
             <span>{badge.label}</span>
           </div>
         ))}
       </div>
     );
   }
 
   return (
     <div
       className={cn(
         variant === 'horizontal'
           ? 'flex flex-wrap items-center justify-center gap-4 md:gap-6'
           : 'space-y-3',
         className
       )}
     >
       {badges.map((badge) => (
         <div
           key={badge.label}
           className={cn(
             'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50',
             variant === 'vertical' && 'w-full'
           )}
         >
           <div className="p-1.5 rounded-md bg-primary/10">
             <badge.icon className="w-4 h-4 text-primary" />
           </div>
           <div>
             <p className="text-sm font-medium text-foreground">{badge.label}</p>
             <p className="text-xs text-muted-foreground">{badge.description}</p>
           </div>
         </div>
       ))}
     </div>
   );
 });