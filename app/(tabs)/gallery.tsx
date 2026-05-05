import { View, Image, FlatList, Pressable, Alert } from "react-native";
import { SafeAreaView } from "@/components/ui";
import { Text } from "@/components/ui";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Download } from "lucide-react-native";

export default function GalleryScreen() {
  const pages = useQuery(api.pages.listPages);

  const saveAsPDF = async (url: string) => {
    try {
      const html = `
        <html>
          <body style="display: flex; justify-content: center; align-items: center; background: white;">
            <img src="${url}" style="max-width: 100%; height: auto;" />
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

  const renderItem = ({ item }: { item: any }) => {
    if (item.status !== "completed" || !item.processedUrl) return null;

    return (
      <View className="mb-6 w-full p-4">
        <View className="overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
          <Image 
            source={{ uri: item.processedUrl }} 
            className="h-64 w-full" 
            resizeMode="contain" 
          />
          <Pressable 
            onPress={() => saveAsPDF(item.processedUrl)}
            className="flex-row items-center justify-center bg-sky-500 p-4"
          >
            <Download size={20} color="white" className="mr-2" />
            <Text className="text-xl font-bold text-white uppercase">Download Again</Text>
          </Pressable>
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
