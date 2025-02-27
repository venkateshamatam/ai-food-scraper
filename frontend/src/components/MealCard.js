"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useFonts, PTSans_700Bold } from "@expo-google-fonts/pt-sans"
import { Inter_400Regular } from "@expo-google-fonts/inter"

import DFBadge from "../../assets/badges/badge-df"
import VGBadge from "../../assets/badges/badge-vg"
import VBadge from "../../assets/badges/badge-v"
import KBadge from "../../assets/badges/badge-ke"
import PABadge from "../../assets/badges/badge-pa"

const fallbackImages = [
  require("../../assets/fallback/food1.png"),
  require("../../assets/fallback/food2.png"),
  require("../../assets/fallback/food3.png"),
  require("../../assets/fallback/food4.png"),
]

// Function to generate a random color from a predefined set
const getRandomColor = () => {
  const colors = ["#FFB6C1", "#FFD700", "#90EE90", "#87CEFA", "#FF6347"]
  return colors[Math.floor(Math.random() * colors.length)]
}

const MealCard = ({ meal }) => {
  const [expanded, setExpanded] = useState(false)
  const [flairColor, setFlairColor] = useState(getRandomColor())
  const [mealImage, setMealImage] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)

  const [fontsLoaded] = useFonts({
    PTSans_700Bold,
    Inter_400Regular,
  })

  // Fetch and set meal image when component mounts or meal photo changes
  useEffect(() => {
    setFlairColor(getRandomColor())
    const loadImage = async () => {
      try {
        const response = await fetch(meal.meal_photos);
        if (!response.ok) {
          throw new Error('Image not found');
        }
        setMealImage(meal.meal_photos);
      } catch (error) {
        setMealImage(fallbackImages[Math.floor(Math.random() * fallbackImages.length)]);
      } finally {
        setLoadingImage(false);
      }
    };

    if (meal.meal_photos && meal.meal_photos !== "NA") {
      loadImage();
    } else {
      setMealImage(fallbackImages[Math.floor(Math.random() * fallbackImages.length)]);
      setLoadingImage(false);
    }
  }, [meal.meal_photos]);

  if (!fontsLoaded) return null

  const dietaryComponents = {
    DF: <DFBadge />,
    VG: <VGBadge />,
    V: <VBadge />,
    K: <KBadge />,
    PA: <PABadge />,
  }

  // Generate dietary badges based on meal's dietary alignment
  const dietaryBadges =
    meal.dietary_alignment !== "NA" && meal.dietary_alignment !== ""
      ? meal.dietary_alignment
        .split(", ")
        .slice(0, 5)
        .map((tag) => dietaryComponents[tag] || null)
      : []

  const descriptionLimit = 50
  const shouldShowMore = meal.description.length > descriptionLimit

  return (
    <View style={styles.card}>
      <View style={[styles.leftAccent, { backgroundColor: flairColor }]} />

      <View style={styles.leftSide}>
        <Text style={styles.title}>
          {meal.meal_name
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </Text>

        {meal.description !== "NA" && (
          <Text style={styles.text}>
            {expanded || !shouldShowMore
              ? meal.description
              : `${meal.description.slice(0, descriptionLimit)}... `}
            {shouldShowMore && (
              <Text style={styles.more} onPress={() => setExpanded(!expanded)}>
                {expanded ? (
                  <>
                    {" "}
                    <Text style={styles.moreUnderline}>Show less</Text>
                  </>
                ) : (
                  <>
                    {" "}
                    <Text style={styles.moreUnderline}>+ more</Text>
                  </>
                )}
              </Text>
            )}
          </Text>
        )}

        <View style={styles.extraInfo}>
          <View style={styles.ingredientsContainer}>
            {meal.ingredients !== "NA" && meal.ingredients.trim() !== "" && (
              <Text style={styles.ingredients}>
                <Text style={styles.boldText}>Ingredients:</Text> {meal.ingredients}
              </Text>
            )}
          </View>
          <View style={styles.priceContainer}>
            {meal.price !== "NA" && <Text style={styles.price}>{meal.price}</Text>}
          </View>
        </View>

        {dietaryBadges.length > 0 && (
          <View style={styles.dietaryTags}>{dietaryBadges}</View>
        )}
      </View>

      <View style={styles.rightSide}>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="edit" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsFavorite(!isFavorite)}>
            <MaterialIcons
              name={isFavorite ? "favorite" : "favorite-outline"}
              size={22}
              color={isFavorite ? "#ff4081" : "#000"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          {loadingImage ? (
            <ActivityIndicator size="large" color="#aaa" style={styles.imageLoader} />
          ) : (
            <>
              <Image
                source={typeof mealImage === "string" ? { uri: mealImage } : mealImage}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.checkmarkContainer}>
                <MaterialIcons name="check" size={16} color="#666" />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginVertical: 10,
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FBF7E2",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
    padding: 12,
  },
  leftAccent: {
    width: 5,
    height: "100%",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    position: "absolute",
    left: 0,
    top: 0,
  },

  leftSide: {
    flex: 3,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "PTSans_700Bold",
    color: "#000",
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#000",
    lineHeight: 20,
  },
  more: {
    fontFamily: "Inter_400Regular",
    color: "#000",
  },
  moreUnderline: {
    textDecorationLine: "underline",
  },
  extraInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },
  ingredientsContainer: {
    flex: 3,
    marginRight: 8,
  },
  priceContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  ingredients: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  dietaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 12,
  },

  rightSide: {
    flex: 1,
    alignItems: "flex-end",
  },
  iconContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  iconButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexDirection: "column",
  },
  image: {
    width: "80%",
    height: "80%",
    borderRadius: 10,
  },
  checkmarkContainer: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  imageLoader: {
    marginTop: 32,
  },
})

export default MealCard