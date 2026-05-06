import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Pressable, ScrollView, ImageBackground } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { SafeAreaView, Text, Button } from "@/components/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, RotateCcw, Undo2, Eraser, Pen, Save } from "lucide-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH - 40;

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt, gestureState) => {
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
      <View className="flex-row items-center justify-between px-4 py-2">
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

      <View className="flex-1 items-center justify-center p-5">
        <View 
          className="overflow-hidden rounded-3xl border-8 border-white bg-white shadow-2xl"
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
      </View>

      <View className="bg-white p-4 rounded-t-[40px] shadow-2xl">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2 px-2">
            <Pressable 
              onPress={() => setTool('pen')}
              className={`items-center justify-center h-12 w-12 rounded-2xl ${tool === 'pen' ? 'bg-sky-500' : 'bg-gray-100'}`}
            >
              <Pen size={24} color={tool === 'pen' ? 'white' : '#64748b'} />
            </Pressable>
            <Pressable 
              onPress={() => setTool('eraser')}
              className={`items-center justify-center h-12 w-12 rounded-2xl ${tool === 'eraser' ? 'bg-sky-500' : 'bg-gray-100'}`}
            >
              <Eraser size={24} color={tool === 'eraser' ? 'white' : '#64748b'} />
            </Pressable>
            <View className="mx-2 h-12 w-[2px] bg-gray-100" />
            <View className="flex-row items-center gap-4">
              {[4, 8, 16, 24].map((size) => (
                <Pressable 
                  key={size}
                  onPress={() => setStrokeWidth(size)}
                  className={`h-8 w-8 items-center justify-center rounded-full ${strokeWidth === size ? 'bg-sky-100 border-2 border-sky-500' : 'bg-gray-50'}`}
                >
                  <View style={{ width: size/2 + 2, height: size/2 + 2, borderRadius: 10, backgroundColor: '#64748b' }} />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} style={{ height: 160 }}>
          <View className="px-2">
            <Text className="mb-2 text-sm font-bold text-gray-400 uppercase tracking-widest">Main Colors</Text>
            <View className="flex-row flex-wrap">
              {[...COLORS.primary, ...COLORS.secondary, ...COLORS.tertiary].map(c => <ColorCircle key={c} c={c} />)}
              {COLORS.neutrals.map(c => <ColorCircle key={c} c={c} />)}
            </View>
            
            <Text className="mb-2 mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Skin Tones</Text>
            <View className="flex-row flex-wrap">
              {COLORS.skintones.map(c => <ColorCircle key={c} c={c} />)}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
