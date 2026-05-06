import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Pressable, ScrollView, ImageBackground } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { SafeAreaView, Text } from "@/components/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, RotateCcw, Undo2, Eraser, Pen, Palette } from "lucide-react-native";
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 20;

const COLORS = {
  primary: ['#FF0000', '#0000FF', '#FFFF00'],
  secondary: ['#00FF00', '#FF7F00', '#8B00FF'],
  tertiary: ['#FF007F', '#7FFF00', '#00FFFF', '#FFD700', '#4B0082', '#A52A2A'],
  skintones: [
    '#FFF5E1', '#FFE0BD', '#FFD1A4', '#F1C27D', '#E0AC69', 
    '#C68642', '#8D5524', '#7A4A21', '#5C3317', '#3D1F0C'
  ],
  neutrals: ['#000000', '#FFFFFF']
};

export default function ColorScreen() {
  const router = useRouter();
  const { imageUrl } = useLocalSearchParams<{ imageUrl: string }>();
  
  const [currentPath, setCurrentPath] = useState<string>('');
  const [paths, setPaths] = useState<string[]>([]);
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['12%', '55%'], []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        setPaths((prev) => [...prev, `${currentPath}|${tool === 'eraser' ? '#FFFFFF' : color}|${strokeWidth}`]);
        setCurrentPath('');
      },
    })
  ).current;

  const undo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    setPaths([]);
  };

  const ColorCircle = ({ c }: { c: string }) => (
    <Pressable 
      onPress={() => {
        setColor(c);
        setTool('pen');
      }}
      className={`m-1 h-10 w-10 rounded-full border-2 ${color === c && tool === 'pen' ? 'border-sky-500 scale-110' : 'border-gray-200'}`}
      style={{ backgroundColor: c }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      {/* Header */}
      <View className="z-10 flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={() => router.back()} className="rounded-full bg-white p-2 shadow-sm">
          <ChevronLeft size={28} color="#0EA5E9" />
        </Pressable>
        <Text className="text-2xl font-black text-sky-600">Coloring Time!</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={undo} className="rounded-full bg-white p-2 shadow-sm">
            <Undo2 size={24} color="#0EA5E9" />
          </Pressable>
          <Pressable onPress={clear} className="rounded-full bg-white p-2 shadow-sm">
            <RotateCcw size={24} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Main Drawing Area */}
      <View className="flex-1 items-start justify-start pt-4">
        <View 
          className="mx-auto overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        >
          <ImageBackground
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          >
            <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill}>
              <Svg style={StyleSheet.absoluteFill}>
                <G>
                  {paths.map((item, index) => {
                    const [pathData, pathColor, pathWidth] = item.split('|');
                    return (
                      <Path
                        key={index}
                        d={pathData}
                        stroke={pathColor}
                        strokeWidth={parseInt(pathWidth)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    );
                  })}
                  {currentPath ? (
                    <Path
                      d={currentPath}
                      stroke={tool === 'eraser' ? '#FFFFFF' : color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null}
                </G>
              </Svg>
            </View>
          </ImageBackground>
        </View>
        <Text className="mt-4 px-6 text-center text-sm font-bold text-sky-300">
          Tip: Pull up the palette to change colors!
        </Text>
      </View>

      {/* Bottom Sheet Palette */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        handleIndicatorStyle={{ backgroundColor: '#0EA5E9', width: 60 }}
        backgroundStyle={{ borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 }}
      >
        <View className="flex-1 px-4">
          {/* Minimized View Header */}
          <View className="mb-2 flex-row items-center justify-between py-2">
            <View className="flex-row items-center gap-4">
              <View 
                className="h-10 w-10 rounded-full border-2 border-white shadow-sm" 
                style={{ backgroundColor: tool === 'eraser' ? '#FFFFFF' : color }}
              />
              <Text className="text-lg font-black text-sky-600">
                {tool === 'eraser' ? 'Eraser' : 'Magic Pen'}
              </Text>
            </View>
            <Palette size={24} color="#0EA5E9" />
          </View>

          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            {/* Tool Selection */}
            <View className="mb-6 flex-row gap-2">
              <Pressable 
                onPress={() => setTool('pen')}
                className={`items-center justify-center h-14 flex-1 rounded-2xl ${tool === 'pen' ? 'bg-sky-500' : 'bg-gray-100'}`}
              >
                <View className="flex-row items-center gap-2">
                  <Pen size={20} color={tool === 'pen' ? 'white' : '#64748b'} />
                  <Text className={`font-bold ${tool === 'pen' ? 'text-white' : 'text-slate-500'}`}>Pen</Text>
                </View>
              </Pressable>
              <Pressable 
                onPress={() => setTool('eraser')}
                className={`items-center justify-center h-14 flex-1 rounded-2xl ${tool === 'eraser' ? 'bg-sky-500' : 'bg-gray-100'}`}
              >
                <View className="flex-row items-center gap-2">
                  <Eraser size={20} color={tool === 'eraser' ? 'white' : '#64748b'} />
                  <Text className={`font-bold ${tool === 'eraser' ? 'text-white' : 'text-slate-500'}`}>Eraser</Text>
                </View>
              </Pressable>
            </View>

            {/* Stroke Width */}
            <Text className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-widest">Brush Size</Text>
            <View className="mb-6 flex-row items-center justify-between rounded-2xl bg-gray-50 p-4">
              {[4, 8, 16, 24, 32].map((size) => (
                <Pressable 
                  key={size}
                  onPress={() => setStrokeWidth(size)}
                  className={`h-12 w-12 items-center justify-center rounded-full ${strokeWidth === size ? 'bg-white shadow-md border-2 border-sky-400' : ''}`}
                >
                  <View style={{ width: size/2 + 2, height: size/2 + 2, borderRadius: 20, backgroundColor: tool === 'eraser' ? '#cbd5e1' : color }} />
                </Pressable>
              ))}
            </View>

            {/* Colors */}
            <Text className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-widest">Magic Colors</Text>
            <View className="mb-4 flex-row flex-wrap">
              {[...COLORS.primary, ...COLORS.secondary, ...COLORS.tertiary, ...COLORS.neutrals].map(c => (
                <ColorCircle key={c} c={c} />
              ))}
            </View>
            
            <Text className="mb-3 mt-2 text-sm font-bold text-gray-400 uppercase tracking-widest">Skin Tones</Text>
            <View className="mb-10 flex-row flex-wrap">
              {COLORS.skintones.map(c => <ColorCircle key={c} c={c} />)}
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
