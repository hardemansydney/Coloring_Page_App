import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

interface Line {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

interface SketchPreviewProps {
  imageUrl: string;
  drawingJson?: string;
  width: number;
  height: number;
  borderRadius?: number;
}

export const SketchPreview: React.FC<SketchPreviewProps> = ({ 
  imageUrl, 
  drawingJson, 
  width, 
  height,
  borderRadius = 16
}) => {
  let lines: Line[] = [];
  try {
    lines = drawingJson ? JSON.parse(drawingJson) : [];
  } catch (e) {
    console.error("SketchPreview: Failed to parse drawingJson", e);
  }

  return (
    <View style={{ width, height, overflow: 'hidden', borderRadius, backgroundColor: 'white' }}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      >
        <Svg style={StyleSheet.absoluteFill}>
          {lines.map((line, i) => (
            <Polyline
              key={i}
              points={line.points.join(',')}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </ImageBackground>
    </View>
  );
};
