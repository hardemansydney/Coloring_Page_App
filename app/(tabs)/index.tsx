import { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Image, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "@/components/ui";
import { Button } from "@/components/ui";
import { Text } from "@/components/ui";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Wand2, Camera, Image as ImageIcon, Download } from "lucide-react-native";

export default function CreateScreen() {
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [pageId, setPageId] = useState<Id<"pages"> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  
  const generateUploadUrl = useMutation(api.pages.generateUploadUrl);
  const createPage = useMutation(api.pages.createPage);
  const pageResult = useQuery(api.pages.getPage, pageId ? { pageId } : "skip");

  const handleTakePhoto = async () => {
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert("Permission Required", "We need camera access to take photos!");
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAndProcess(result.assets[0].uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not take photo");
    }
  };

  const handlePickImage = async () => {
    try {
      if (!libraryPermission?.granted) {
        const result = await requestLibraryPermission();
        if (!result.granted) {
          Alert.alert("Permission Required", "We need library access to pick photos!");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAndProcess(result.assets[0].uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not pick image");
    }
  };

  const uploadAndProcess = async (uri: string) => {
    const ensureHttps = (url: string) => {
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

    try {
      setIsProcessing(true);
      setPhoto(uri);
      setUploadStage("Preparing...");
      console.log("Starting upload and process for URI:", uri);
      
      let uploadUrl = await generateUploadUrl();
      uploadUrl = ensureHttps(uploadUrl);
      console.log("Generated upload URL:", uploadUrl);
      setUploadStage("Reading photo...");

      const response = await fetch(uri);
      const blob = await response.blob();
      console.log("Blob created:", blob.type, blob.size);
      
      setUploadStage("Uploading...");
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.status} ${result.statusText}`);
      }

      const uploadResult = (await result.json()) as { storageId: Id<"_storage"> };
      console.log("Upload successful, storageId:", uploadResult.storageId);

      setUploadStage("Starting AI Magic...");
      const id = await createPage({ originalImageId: uploadResult.storageId });
      console.log("Page created in Convex, ID:", id);
      setPageId(id);
      setUploadStage(null);
    } catch (error) {
      console.error("Detailed upload error:", error);
      let errorMessage = "Failed to start processing";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      } else {
        errorMessage += `: ${JSON.stringify(error)}`;
      }
      Alert.alert("Error", errorMessage);
      setIsProcessing(false);
      setUploadStage(null);
    }
  };

  const saveAsPDF = async () => {
    if (!pageResult?.processedUrl) return;
    try {
      const html = `
        <html>
          <body style="display: flex; justify-content: center; align-items: center; background: white;">
            <img src="${pageResult.processedUrl}" style="max-width: 100%; height: auto;" />
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save PDF");
    }
  };

  const reset = () => {
    setPhoto(null);
    setPageId(null);
    setIsProcessing(false);
    setUploadStage(null);
  };

  if (photo) {
    return (
      <SafeAreaView className="flex-1 bg-yellow-50">
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center" }}>
          <Text className="mb-6 text-4xl font-black text-pink-500">
            Magic Time! ✨
          </Text>

          <View className="mb-8 overflow-hidden rounded-3xl border-8 border-white bg-white shadow-xl">
            {pageResult?.status === "completed" ? (
              <Image 
                source={{ uri: pageResult.processedUrl! }} 
                className="h-80 w-80" 
                resizeMode="contain" 
              />
            ) : (
              <View className="h-80 w-80 items-center justify-center bg-gray-100">
                <Image source={{ uri: photo }} className="h-full w-full opacity-30" />
                <View className="absolute items-center justify-center">
                  <ActivityIndicator size="large" color="#FF6B6B" />
                  <Text className="mt-4 text-xl font-bold text-gray-600">
                    {uploadStage || (pageResult?.status === "processing" ? "Sketching..." : "Uploading...")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {pageResult?.status === "completed" ? (
            <View className="w-full gap-4">
              <Button size="lg" className="h-16 bg-green-500" onPress={saveAsPDF}>
                <Download className="mr-2 text-white" />
                <Text className="text-2xl font-black text-white">Save PDF</Text>
              </Button>
              <Button size="lg" variant="outline" className="h-16 border-4 border-pink-400" onPress={reset}>
                <Text className="text-2xl font-black text-pink-400">Make Another</Text>
              </Button>
            </View>
          ) : pageResult?.status === "failed" ? (
            <View className="w-full gap-4">
              <Text className="text-center text-xl font-bold text-red-500">Oh no! Something went wrong.</Text>
              <Button size="lg" className="h-16 bg-pink-500" onPress={reset}>
                <Text className="text-2xl font-black text-white">Try Again</Text>
              </Button>
            </View>
          ) : (
            <Text className="text-center text-lg font-bold text-gray-400">
              Hold tight! We're making your coloring page kid-friendly.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="flex-1 items-center justify-center p-6">
        <View className="mb-10 items-center">
          <View className="mb-4 rounded-full bg-pink-400 p-6 shadow-lg">
            <Wand2 size={80} color="white" />
          </View>
          <Text className="text-center text-5xl font-black text-sky-600">
            Coloring{'\n'}Magic!
          </Text>
        </View>

        <View className="w-full gap-5">
          <Button 
            size="lg" 
            className="h-24 rounded-3xl bg-pink-500 shadow-xl shadow-pink-200" 
            onPress={handleTakePhoto}
          >
            <Camera size={32} color="white" className="mr-3" />
            <Text className="text-3xl font-black text-white">Take Photo</Text>
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="h-20 rounded-3xl border-4 border-sky-400 bg-white shadow-xl shadow-sky-100" 
            onPress={handlePickImage}
          >
            <ImageIcon size={28} color="#38BDF8" className="mr-3" />
            <Text className="text-2xl font-black text-sky-400">Pick Photo</Text>
          </Button>
        </View>

        <Text className="mt-10 text-center text-lg font-bold text-sky-300">
          Turn your favorite photos into{'\n'}fun coloring pages!
        </Text>
      </View>
    </SafeAreaView>
  );
}
