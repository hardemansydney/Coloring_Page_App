import * as React from 'react';
import { View as RNView, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

const View = React.forwardRef<React.ElementRef<typeof RNView>, ViewProps>(
  ({ className, ...props }, ref) => (
    <RNView className={cn(className)} ref={ref} {...props} />
  )
);
View.displayName = 'View';

export { View };
