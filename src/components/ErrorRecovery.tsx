 import React from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
 import { QuantisError, isRecoverableError, getErrorMessage } from '@/lib/errors';
 import { cn } from '@/lib/utils';
 
 interface ErrorRecoveryProps {
   error: unknown;
   onRetry?: () => void;
   onGoHome?: () => void;
   onGoBack?: () => void;
   className?: string;
   compact?: boolean;
 }
 
 export const ErrorRecovery = React.memo(function ErrorRecovery({
   error,
   onRetry,
   onGoHome,
   onGoBack,
   className,
   compact = false,
 }: ErrorRecoveryProps) {
   const message = getErrorMessage(error);
   const recoverable = isRecoverableError(error);
   const errorObj = error instanceof QuantisError ? error : null;
 
   if (compact) {
     return (
       <div
         className={cn(
           'flex items-center justify-between gap-3 p-3 rounded-lg',
           'bg-destructive/5 border border-destructive/20',
           className
         )}
       >
         <div className="flex items-center gap-2 text-destructive">
           <AlertCircle className="w-4 h-4 flex-shrink-0" />
           <span className="text-sm">{message}</span>
         </div>
         {recoverable && onRetry && (
           <Button
             size="sm"
             variant="outline"
             onClick={onRetry}
             className="gap-1 flex-shrink-0"
           >
             <RefreshCw className="w-3 h-3" />
             Retry
           </Button>
         )}
       </div>
     );
   }
 
   return (
     <Card className={cn('border-destructive/30', className)}>
       <CardHeader className="text-center pb-2">
         <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
           <AlertCircle className="w-6 h-6 text-destructive" />
         </div>
         <CardTitle className="text-xl">Something went wrong</CardTitle>
         <CardDescription className="text-base">{message}</CardDescription>
       </CardHeader>
 
       <CardContent className="space-y-4">
         {/* Technical details (dev only) */}
         {import.meta.env.DEV && errorObj && (
           <div className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto">
             <p className="text-muted-foreground">
               Code: {errorObj.code}
             </p>
             {errorObj.technical && (
               <p className="text-muted-foreground mt-1 truncate">
                 {errorObj.technical}
               </p>
             )}
           </div>
         )}
 
         {/* Action buttons */}
         <div className="flex flex-col sm:flex-row gap-2">
           {recoverable && onRetry && (
             <Button onClick={onRetry} className="flex-1 gap-2">
               <RefreshCw className="w-4 h-4" />
               Try Again
             </Button>
           )}
 
           {onGoBack && (
             <Button
               variant="outline"
               onClick={onGoBack}
               className="flex-1 gap-2"
             >
               <ArrowLeft className="w-4 h-4" />
               Go Back
             </Button>
           )}
 
           {onGoHome && (
             <Button
               variant="outline"
               onClick={onGoHome}
               className="flex-1 gap-2"
             >
               <Home className="w-4 h-4" />
               Home
             </Button>
           )}
         </div>
 
         {/* Help text */}
         {!recoverable && (
           <p className="text-xs text-center text-muted-foreground">
             If this issue persists, please contact support.
           </p>
         )}
       </CardContent>
     </Card>
   );
 });