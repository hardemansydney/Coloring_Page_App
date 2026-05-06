import { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "@/components/ui";
import { Button } from "@/components/ui";
import { Text } from "@/components/ui";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { Wand2, Camera, Image as ImageIcon } from "lucide-react-native";

export default function CreateScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isUploading, setIsUploading] = useState(false);
  
  const generateUploadUrl = useMutation(api.pages.generateUploadUrl);
  const createPage = useMutation(api.pages.createPage);

  const resolveConvexUrl = (url: string) => {
    const sandboxId = "ipjonh1q6vj4r3aknu5c7";
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return url.replace(/^http:\/\/(127\.0\.0\.1|localhost):(\d+)/, (match, host, port) => {
        return `https://${port}-${sandboxId}.app.cto.new`;
      });
    }
    if (url.startsWith("http://")) {
      return url.replace("http://", "https://");
    }
    return url;
  };

  const handleTakePhoto = async () => {
    try {
      const currentPermission = await ImagePicker.getCameraPermissionsAsync();
      
      if (currentPermission.status !== "granted") {
        const permissionResult = await requestCameraPermission();
        if (permissionResult.status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow camera access in your device settings to take a photo.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Encourage square photos
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAndProcess(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Take photo error:", error);
      Alert.alert("Error", "Could not open camera");
    }
  };

  const handlePickImage = async () => {
    try {
      // Check current permission status
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (currentPermission.status !== "granted") {
        const permissionResult = await requestLibraryPermission();
        if (permissionResult.status !== "granted") {
          Alert.alert(
            "Permission Required", 
            "Please allow access to your photo library in your device settings to pick a photo.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Encourage square photos for better AI results
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAndProcess(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Pick image error:", error);
      Alert.alert("Error", "Could not open photo library");
    }
  };

  const uploadAndProcess = async (uri: string) => {
    try {
      setIsUploading(true);
      
      // Get upload URL
      let uploadUrl = await generateUploadUrl();
      uploadUrl = resolveConvexUrl(uploadUrl);

      // Read file
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      
      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };

      // Create page record
      const id = await createPage({ originalImageId: storageId });
      
      // Navigate to separate processing route
      router.push({
        pathname: "/processing",
        params: { photoUri: uri, pageId: id }
      });

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to start processing");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, padding: 24, alignItems: "center", justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10 items-center">
          <View className="mb-6 rounded-full bg-pink-400 p-8 shadow-lg">
            <Wand2 size={64} color="white" />
          </View>
          <Text className="text-center text-5xl font-black leading-tight text-sky-600">
            Coloring{'\n'}Magic!
          </Text>
        </View>

        <View className="w-full max-w-[400px] gap-5">
          <Button 
            size="lg" 
            className="h-20 w-full rounded-3xl bg-pink-500 shadow-xl shadow-pink-200" 
            onPress={handleTakePhoto}
            disabled={isUploading}
          >
            <Camera size={28} color="white" className="mr-3" />
            <Text className="text-3xl font-black text-white">
              {isUploading ? "Uploading..." : "Take Photo"}
            </Text>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="h-20 w-full rounded-3xl border-4 border-sky-400 bg-white shadow-xl shadow-sky-100" 
            onPress={handlePickImage}
            disabled={isUploading}
          >
            <ImageIcon size={28} color="#38BDF8" className="mr-3" />
            <Text className="text-2xl font-black text-sky-400">Pick Photo</Text>
          </Button>
        </View>

        <Text className="mt-12 max-w-[280px] text-center text-lg font-bold leading-relaxed text-sky-300">
          Turn your favorite photos into fun coloring pages!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
