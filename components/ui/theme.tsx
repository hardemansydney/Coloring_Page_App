import * as React from 'react';
import { View } from 'react-native';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-background">{children}</View>;
}
