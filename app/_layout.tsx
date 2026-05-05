import 'react-native-reanimated';
import '../global.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider as UIThemeProvider } from '@/components/ui/theme';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getConvexUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  
  const isWeb = Platform.OS === 'web';
  // @ts-ignore
  const hostname = isWeb ? (typeof window !== 'undefined' ? window.location.hostname : '') : '';
  const isCtoNew = hostname.includes("cto.new");
  
  if (isCtoNew) {
    const parts = hostname.split("-");
    if (parts.length > 1) {
      const suffix = parts.slice(1).join("-");
      return `https://3210-${suffix}`;
    }
  }

  const sandboxId = "ipjonh1q6vj4r3aknu5c7"; 
  
  if (!isWeb || isCtoNew) {
    return `https://3210-${sandboxId}.app.cto.new`;
  }
  
  if (envUrl?.startsWith("http://")) {
    if (envUrl.includes("127.0.0.1") || envUrl.includes("localhost")) {
      return `https://3210-${sandboxId}.app.cto.new`;
    }
    return envUrl.replace("http://", "https://");
  }
  
  return envUrl || "";
};

const convex = new ConvexReactClient(getConvexUrl());

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <UIThemeProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </UIThemeProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ConvexProvider>
  );
}
