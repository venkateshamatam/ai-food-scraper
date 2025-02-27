import React, { useEffect, useState } from "react";
import {
  View, FlatList, ActivityIndicator, Text, StyleSheet,
  SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, Linking
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LucideInstagram, LucideMapPin, LucideStar, LucideMessageSquare } from "lucide-react-native";
import MealCard from "../components/MealCard";
import { getMealsByVendor, getVendorDetails } from "../services/api";
import { useFonts, PTSans_700Bold } from "@expo-google-fonts/pt-sans";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import { capitalizeWords } from '../utils.js';

const menuBackground = require("../../assets/menu_background.png");
const menuLoadingImage = require("../../assets/fallback/menu_loading.jpg");

const MenuScreen = ({ route }) => {
  const { vendorId } = route.params;
  const [meals, setMeals] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeout, setTimeoutState] = useState(false);
  const [fetching, setFetching] = useState(false);
  const navigation = useNavigation();

  let [fontsLoaded] = useFonts({
    PTSans_700Bold,
    Inter_400Regular,
  });

  useEffect(() => {
    navigation.setOptions({ headerShown: true });

    const fetchData = async () => {
      try {
        // Set a timeout for the API requests
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 600000)
        );

        const vendorDataPromise = getVendorDetails(vendorId);
        const mealsDataPromise = getMealsByVendor(vendorId);

        // Race between the API requests and the timeout
        const [vendorData, mealsData] = await Promise.race([
          Promise.all([vendorDataPromise, mealsDataPromise]),
          timeoutPromise
        ]);

        if (!vendorData) throw new Error("Vendor details not found");
        console.log(mealsData);
        if (mealsData.status === 202) {
          setFetching(true);
          setLoading(false);
          return;
        }

        if (!Array.isArray(mealsData) || mealsData.length === 0) {
          throw new Error("No meals found");
        }

        setVendor(vendorData);
        setMeals(mealsData);
        setTimeoutState(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setTimeoutState(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

  if (!fontsLoaded) return null; // Wait for fonts to load before rendering

  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
        <Text style={styles.loadingText}>
          We're fetching the latest menu for you... this may take a while.
        </Text>
      </View>
    </SafeAreaView>
  );

  if (fetching) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={menuLoadingImage} style={styles.loadingImage} resizeMode="contain" />
        <Text style={styles.loadingText}>
          We're fetching the latest menu for you... this may take a while. Please check back in some time.
        </Text>
      </View>
    </SafeAreaView>
  );

  if (error || timeout) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.error}>{error || "Request timed out"}</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MealCard key={item.id.toString()} meal={item} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => vendor && <FoodiePick vendor={vendor} navigation={navigation} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const FoodiePick = ({ vendor, navigation }) => {
  const socialLinks = [
    { key: "instagram", url: vendor?.social_links?.instagram, icon: LucideInstagram },
    { key: "google_maps", url: vendor?.social_links?.google_maps, icon: LucideMapPin },
    { key: "infatuation", url: vendor?.review_links?.infatuation, icon: LucideMessageSquare },
    { key: "eater", url: vendor?.review_links?.eater, icon: LucideStar },
  ].filter(link => link.url && link.url !== "NA");

  return (
    <View style={styles.foodiePickContainer}>
      <Image source={menuBackground} style={styles.backgroundImage} resizeMode="cover" />

      <View style={styles.overlay}>

        <View style={styles.topTags}>
          <Text style={styles.todayText}>TODAY</Text>
          <View style={styles.foodieTag}>
            <Text style={styles.foodieText}>Foodie Pick</Text>
          </View>
        </View>

        <Text style={styles.vendorName}>{capitalizeWords(vendor.vendor_name)}</Text>
        {vendor.vendor_description ? (
          <Text style={styles.vendorDescription}>{vendor.vendor_description}</Text>
        ) : null}

        {socialLinks.length > 0 && (
          <View style={styles.socialIcons}>
            {socialLinks.map(({ key, url, icon: Icon }) => (
              <TouchableOpacity key={key} onPress={() => Linking.openURL(url)}>
                <Icon size={22} color="white" style={styles.icon} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingImage: {
    width: "80%",
    height: 200,
    marginBottom: 20,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingBottom: 20,
  },

  foodiePickContainer: {
    width: "100%",
    height: 300,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 20,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 15,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },

  topTags: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayText: {
    fontFamily: "Inter",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    color: "#fff",
  },
  foodieTag: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  foodieText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  vendorName: {
    fontSize: 42,
    fontWeight: "700",
    fontFamily: "PT Sans",
    lineHeight: 42,
    color: "#fff",
    letterSpacing: 0,
    marginTop: 5,
  },
  vendorDescription: {
    fontSize: 14,
    fontWeight: "400",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    color: "#fff",
    letterSpacing: 0,
    marginTop: 5,
  },
  socialIcons: {
    flexDirection: "row",
    marginTop: 10,
  },
  icon: {
    marginRight: 12,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default MenuScreen;