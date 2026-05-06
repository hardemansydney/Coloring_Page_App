import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Pressable, ScrollView, ImageBackground, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Defs, Filter, FeColorMatrix, G, Image as SvgImage } from 'react-native-svg';
import { SafeAreaView, Text } from "@/components/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, RotateCcw, Undo2, Eraser, Pen } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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

interface Line {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

export default function ColorScreen() {
  const router = useRouter();
  const { pageId } = useLocalSearchParams<{ pageId: string }>();
  
  const pageResult = useQuery(api.pages.getPage, { pageId: pageId as Id<"pages"> });
  const saveDrawing = useMutation(api.pages.saveDrawing);
  
  const [lines, setLines] = useState<Line[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(12);
  const [isSaving, setIsSaving] = useState(false);
  
  const isDrawing = useRef(false);
  
  // Use refs to avoid stale closures in PanResponder
  const colorRef = useRef(color);
  const toolRef = useRef(tool);
  const widthRef = useRef(strokeWidth);

  useEffect(() => {
    colorRef.current = color;
    toolRef.current = tool;
    widthRef.current = strokeWidth;
  }, [color, tool, strokeWidth]);

  // Initialize lines from Convex
  useEffect(() => {
    if (pageResult?.drawing) {
      try {
        const savedLines = JSON.parse(pageResult.drawing);
        if (Array.isArray(savedLines)) {
          setLines(savedLines);
        }
      } catch (e) {
        console.error("Failed to parse saved drawing", e);
      }
    }
  }, [pageResult?.drawing]);

  const fixConvexUrl = (url: string | null | undefined) => {
    if (!url) return "";
    const sandboxId = "ipjonh1q6vj4r3aknu5c7";
    if (url.includes("127.0.0.1") || url.includes("localhost")) {
      return url.replace(/^http:\/\/(127\.0\.0\.1|localhost):(\d+)/, (match, host, port) => {
        return `https://${port}-${sandboxId}.app.cto.new`;
      });
    }
    return url;
  };

  const persistDrawing = async (updatedLines: Line[]) => {
    setIsSaving(true);
    try {
      await saveDrawing({ 
        pageId: pageId as Id<"pages">, 
        drawing: JSON.stringify(updatedLines) 
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDrawing.current = true;
        const { locationX, locationY } = evt.nativeEvent;
        
        const currentTool = toolRef.current;
        const currentColor = colorRef.current;
        const currentWidth = widthRef.current;

        setLines((prev) => [...prev, { 
          tool: currentTool, 
          points: [locationX, locationY],
          color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
          width: currentWidth
        }]);
      },
      onPanResponderMove: (evt) => {
        if (!isDrawing.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        
        setLines((prev) => {
          const newLines = [...prev];
          const lastLine = { ...newLines[newLines.length - 1] };
          lastLine.points = [...lastLine.points, locationX, locationY];
          newLines[newLines.length - 1] = lastLine;
          return newLines;
        });
      },
      onPanResponderRelease: () => {
        isDrawing.current = false;
        // Persist the current lines state to backend
        setLines((currentLines) => {
          persistDrawing(currentLines);
          return currentLines;
        });
      },
    })
  ).current;

  const undo = () => {
    setLines((prev) => {
      const newLines = prev.slice(0, -1);
      persistDrawing(newLines);
      return newLines;
    });
  };

  const clear = () => {
    setLines([]);
    persistDrawing([]);
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

  if (!pageResult) {
    return (
      <View className="flex-1 items-center justify-center bg-sky-50">
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      {/* Top Section (20%) */}
      <View style={{ height: '20%', justifyContent: 'center' }} className="px-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="rounded-full bg-white p-3 shadow-md">
            <ChevronLeft size={32} color="#0EA5E9" />
          </Pressable>
          <Text className="text-3xl font-black text-sky-600">Coloring!</Text>
          <View className="flex-row gap-3">
            <Pressable onPress={undo} className="rounded-full bg-white p-3 shadow-md">
              <Undo2 size={28} color="#0EA5E9" />
            </Pressable>
            <Pressable onPress={clear} className="rounded-full bg-white p-3 shadow-md">
              <RotateCcw size={28} color="#EF4444" />
            </Pressable>
          </View>
        </View>
        <View className="mt-4 flex-row items-center justify-center gap-4">
          {isSaving ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#0EA5E9" />
              <Text className="text-sm font-bold text-sky-400">Saving...</Text>
            </View>
          ) : (
            <>
              <View 
                className="h-6 w-6 rounded-full border-2 border-white shadow-sm" 
                style={{ backgroundColor: tool === 'eraser' ? '#FFFFFF' : color }}
              />
              <Text className="text-lg font-bold text-sky-400">
                {tool === 'eraser' ? 'Magic Eraser' : 'Magic Pen'}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Middle Section (50%) */}
      <View style={{ height: '50%', alignItems: 'center', justifyContent: 'center' }} className="px-2">
        <View 
          className="overflow-hidden rounded-3xl border-8 border-white bg-white shadow-2xl"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        >
          <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill}>
            <Svg 
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            >
              <Defs>
                <Filter id="lineFilter">
                  <FeColorMatrix
                    type="matrix"
                    values="1 0 0 0 0 
                            0 1 0 0 0 
                            0 0 1 0 0 
                            -1 -1 -1 0 1"
                  />
                </Filter>
              </Defs>

              {/* Layer 1: The background sketch (Base) */}
              <SvgImage
                href={fixConvexUrl(pageResult.processedUrl)}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
              />

              {/* Layer 2: The coloring strokes */}
              <G>
                {lines.map((line, i) => (
                  <Polyline
                    key={i}
                    points={line.points?.join(',') || ""}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </G>

              {/* Layer 3: The black lines of the sketch (Always on top) */}
              <G filter="url(#lineFilter)">
                <SvgImage
                  href={fixConvexUrl(pageResult.processedUrl)}
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid meet"
                />
              </G>
            </Svg>
          </View>
        </View>
      </View>

      {/* Bottom Section (30%) */}
      <View style={{ height: '30%' }} className="bg-white rounded-t-[40px] shadow-2xl pt-4">
        <View className="flex-1 px-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 max-h-16">
            <View className="flex-row items-center gap-3 px-2">
              <Pressable 
                onPress={() => setTool('pen')}
                className={`flex-row items-center justify-center h-12 px-4 rounded-2xl ${tool === 'pen' ? 'bg-sky-500' : 'bg-gray-100'}`}
              >
                <Pen size={20} color={tool === 'pen' ? 'white' : '#64748b'} className="mr-2" />
                <Text className={`font-bold ${tool === 'pen' ? 'text-white' : 'text-slate-500'}`}>Pen</Text>
              </Pressable>
              <Pressable 
                onPress={() => setTool('eraser')}
                className={`flex-row items-center justify-center h-12 px-4 rounded-2xl ${tool === 'eraser' ? 'bg-sky-500' : 'bg-gray-100'}`}
              >
                <Eraser size={20} color={tool === 'eraser' ? 'white' : '#64748b'} className="mr-2" />
                <Text className={`font-bold ${tool === 'eraser' ? 'text-white' : 'text-slate-500'}`}>Eraser</Text>
              </Pressable>
              <View className="h-10 w-[2px] bg-gray-100" />
              <View className="flex-row items-center gap-3">
                {[4, 12, 24, 40].map((size) => (
                  <Pressable 
                    key={size}
                    onPress={() => setStrokeWidth(size)}
                    className={`h-10 w-10 items-center justify-center rounded-full ${strokeWidth === size ? 'bg-sky-100 border-2 border-sky-400' : 'bg-gray-50'}`}
                  >
                    <View style={{ width: size/4 + 4, height: size/4 + 4, borderRadius: 20, backgroundColor: tool === 'eraser' ? '#cbd5e1' : color }} />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-2 pb-8">
              <Text className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Main Colors</Text>
              <View className="flex-row flex-wrap mb-4">
                {[...COLORS.primary, ...COLORS.secondary, ...COLORS.tertiary, ...COLORS.neutrals].map(c => (
                  <ColorCircle key={c} c={c} />
                ))}
              </View>
              
              <Text className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Skin Tones</Text>
              <View className="flex-row flex-wrap">
                {COLORS.skintones.map(c => <ColorCircle key={c} c={c} />)}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
