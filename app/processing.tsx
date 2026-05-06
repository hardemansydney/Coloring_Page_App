import { useEffect } from "react";
import { View, Image, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { SafeAreaView, Text, Button } from "@/components/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Download, Pen } from "lucide-react-native";
import { SketchPreview } from "@/components/SketchPreview";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProcessingScreen() {
  const router = useRouter();
  const { photoUri, pageId } = useLocalSearchParams<{ photoUri: string; pageId: string }>();
  
  const pageResult = useQuery(api.pages.getPage, pageId ? { pageId: pageId as Id<"pages"> } : "skip");

  const resolveConvexUrl = (url: string | null | undefined) => {
    if (!url) return "";
    const sandboxId = "ipjonh1q6vj4r3aknu5c7";
    if (url.includes("127.0.0.1") || url.includes("localhost")) {
      return url.replace(/^http:\/\/(127\.0\.0\.1|localhost):(\d+)/, (match, host, port) => {
        return `https://${port}-${sandboxId}.app.cto.new`;
      });
    }
    return url;
  };

  const saveAsPDF = async () => {
    const url = resolveConvexUrl(pageResult?.processedUrl);
    if (!url) return;
    let lines: any[] = [];
    try {
      lines = pageResult?.drawing ? JSON.parse(pageResult.drawing) : [];
    } catch (e) {
      console.error(e);
    }

    try {
      // Build Polyline paths for the PDF
      const polylinesHtml = lines.map(line => {
        return `<polyline points="${line.points?.join(',') || ""}" fill="none" stroke="${line.color}" stroke-width="${line.width}" stroke-linecap="round" stroke-linejoin="round" />`;
      }).join('');

      const html = `
        <html>
          <body style="display: flex; justify-content: center; align-items: center; background: pink; margin: 0; padding: 0;">
            <div style="position: relative; width: 1000px; height: 1000px; background: white;">
              <!-- Layer 1: Coloring Strokes -->
              <svg viewBox="0 0 ${SCREEN_WIDTH - 20} ${SCREEN_WIDTH - 20}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                ${polylinesHtml}
              </svg>
              <!-- Layer 2: Sketch Outlines (Always on top via Multiply) -->
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${url}'); background-size: contain; background-repeat: no-repeat; background-position: center; mix-blend-mode: multiply;"></div>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
    }
  };

  const reset = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-yellow-50">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, padding: 20, alignItems: "center", justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-6 text-center text-4xl font-black text-pink-500">
          Magic Time! ✨
        </Text>

        <View className="mb-8 aspect-square w-full max-w-[400px] overflow-hidden rounded-3xl border-8 border-white bg-white shadow-xl">
          {pageResult?.status === "completed" ? (
            <SketchPreview 
              imageUrl={resolveConvexUrl(pageResult.processedUrl!)}
              drawingJson={pageResult.drawing}
              width={Math.min(SCREEN_WIDTH - 40, 400)}
              height={Math.min(SCREEN_WIDTH - 40, 400)}
              borderRadius={0}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-gray-100">
              <Image source={{ uri: photoUri }} className="absolute h-full w-full opacity-30" />
              <View className="items-center justify-center p-4">
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text className="mt-4 text-center text-xl font-bold text-gray-600">
                  {pageResult?.status === "processing" ? "Sketching..." : "Uploading..."}
                </Text>
              </View>
            </View>
          )}
        </View>

        {pageResult?.status === "completed" ? (
          <View className="w-full max-w-[400px] gap-4">
            <Button size="lg" className="h-16 w-full bg-sky-500" onPress={() => router.push({
              pathname: "/color",
              params: { pageId: pageId }
            })}>
              <View className="flex-row items-center">
                <Pen size={24} color="white" className="mr-2" />
                <Text className="text-2xl font-black text-white">Color My Picture</Text>
              </View>
            </Button>
            <Button size="lg" className="h-16 w-full bg-green-500" onPress={saveAsPDF}>
              <Download size={24} color="white" className="mr-2" />
              <Text className="text-2xl font-black text-white">Save PDF</Text>
            </Button>
            <Button size="lg" variant="outline" className="h-16 w-full border-4 border-pink-400" onPress={reset}>
              <Text className="text-2xl font-black text-pink-400">Make Another</Text>
            </Button>
          </View>
        ) : pageResult?.status === "failed" ? (
          <View className="w-full max-w-[400px] gap-4">
            <Text className="text-center text-xl font-bold text-red-500">Oh no! Something went wrong.</Text>
            <Button size="lg" className="h-16 w-full bg-pink-500" onPress={reset}>
              <Text className="text-2xl font-black text-white">Try Again</Text>
            </Button>
          </View>
        ) : (
          <Text className="max-w-[300px] text-center text-lg font-bold text-gray-400">
            Hold tight! We're making your coloring page kid-friendly.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
