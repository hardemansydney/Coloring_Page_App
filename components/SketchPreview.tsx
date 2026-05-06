import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Defs, Filter, FeColorMatrix, G, Image as SvgImage } from 'react-native-svg';

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
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Filter id="lineFilterPreview">
            <FeColorMatrix
              type="matrix"
              values="1 0 0 0 0 
                      0 1 0 0 0 
                      0 0 1 0 0 
                      -1 -1 -1 0 1"
            />
          </Filter>
        </Defs>

        {/* Layer 1: Background */}
        <SvgImage
          href={imageUrl}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Layer 2: Drawing */}
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

        {/* Layer 3: Outlines */}
        <G filter="url(#lineFilterPreview)">
          <SvgImage
            href={imageUrl}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
          />
        </G>
      </Svg>
    </View>
  );
};
