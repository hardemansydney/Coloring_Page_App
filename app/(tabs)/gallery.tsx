import { View, Image, FlatList, Pressable, Alert, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "@/components/ui";
import { Text, Button } from "@/components/ui";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Download, Trash2, Pen } from "lucide-react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SketchPreview } from "@/components/SketchPreview";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GalleryScreen() {
  const router = useRouter();
  const pages = useQuery(api.pages.listPages);
  const deletePage = useMutation(api.pages.deletePage);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const saveAsPDF = async (url: string, drawingJson?: string) => {
    const fixedUrl = fixConvexUrl(url);
    let lines: any[] = [];
    try {
      lines = drawingJson ? JSON.parse(drawingJson) : [];
    } catch (e) {
      console.error(e);
    }
    
    try {
      // Build Polyline paths for the PDF
      const polylinesHtml = lines.map(line => {
        return `<polyline points="${line.points.join(',')}" fill="none" stroke="${line.color}" stroke-width="${line.width}" stroke-linecap="round" stroke-linejoin="round" />`;
      }).join('');

      const html = `
        <html>
          <body style="display: flex; justify-content: center; align-items: center; background: pink; margin: 0; padding: 0;">
            <div style="position: relative; width: 1000px; height: 1000px; background-image: url('${fixedUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center;">
              <svg viewBox="0 0 ${SCREEN_WIDTH - 20} ${SCREEN_WIDTH - 20}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                ${polylinesHtml}
              </svg>
            </div>
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

  const handleDelete = (pageId: any) => {
    Alert.alert(
      "Delete Page?",
      "Are you sure you want to delete this magic sketch? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(pageId);
              await deletePage({ pageId });
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete page");
            } finally {
              setIsDeleting(null);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.status !== "completed" || !item.processedUrl) return null;

    return (
      <View className="mb-6 w-full p-4">
        <View className="overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
          <SketchPreview 
            imageUrl={fixConvexUrl(item.processedUrl)}
            drawingJson={item.drawing}
            width={SCREEN_WIDTH - 40}
            height={SCREEN_WIDTH - 40}
            borderRadius={0}
          />
          <View className="flex-row">
            <Pressable 
              onPress={() => router.push({
                pathname: "/color",
                params: { pageId: item._id }
              })}
              className="w-16 items-center justify-center bg-sky-500 p-4 border-r border-white/20"
            >
              <Pen size={24} color="white" />
            </Pressable>
            
            <Pressable 
              onPress={() => saveAsPDF(item.processedUrl, item.drawing)}
              className="flex-1 flex-row items-center justify-center bg-green-500 p-4"
            >
              <Download size={20} color="white" className="mr-2" />
              <Text className="text-xl font-bold text-white uppercase">Save</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => handleDelete(item._id)}
              disabled={isDeleting === item._id}
              className="w-16 items-center justify-center bg-red-500 p-4 border-l border-white/20"
            >
              {isDeleting === item._id ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Trash2 size={24} color="white" />
              )}
            </Pressable>
          </View>
        </View>
        <Text className="mt-2 text-center font-bold text-sky-400">
          Made on {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="p-6">
        <Text className="text-4xl font-black text-pink-500">My Gallery</Text>
        <Text className="text-lg font-bold text-sky-400">All your magic sketches!</Text>
      </View>

      {pages?.length === 0 ? (
        <View className="flex-1 items-center justify-center p-10">
          <Text className="text-center text-2xl font-black text-gray-300">
            No sketches yet!{'\n'}Go create some magic! ✨
          </Text>
        </View>
      ) : (
        <FlatList
          data={pages}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
