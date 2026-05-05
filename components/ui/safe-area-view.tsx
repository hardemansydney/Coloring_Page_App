import * as React from 'react';
import { SafeAreaView as RNSafeAreaView, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

const SafeAreaView = React.forwardRef<
  React.ElementRef<typeof RNSafeAreaView>,
  ViewProps & { edges?: string[] }
>(({ className, ...props }, ref) => (
  <RNSafeAreaView
    className={cn('flex-1 bg-background', className)}
    ref={ref}
    {...props}
  />
));
SafeAreaView.displayName = 'SafeAreaView';

export { SafeAreaView };
