import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Camera, Image as ImageIcon } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF6B6B", // Fun bright red
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFF9C4", // Fun light yellow
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <Camera size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "My Pages",
          tabBarIcon: ({ color }) => <ImageIcon size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
