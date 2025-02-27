import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image
} from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import { capitalizeWords } from '../utils.js';

const fallbackLogos = [
  require("../../assets/fallback/vendor_logo_1.png"),
  require("../../assets/fallback/vendor_logo_2.png"),
  require("../../assets/fallback/vendor_logo_3.png")
];

// Function to get a random fallback logo
const getRandomFallbackLogo = () => fallbackLogos[Math.floor(Math.random() * fallbackLogos.length)];

const VendorCard = ({ vendor, color, onPress }) => {
  // Use vendor logo if available, otherwise use a random fallback logo
  const logoUri = vendor.vendor_logo && vendor.vendor_logo !== "NA" ? vendor.vendor_logo : getRandomFallbackLogo();

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.vendorName}>{capitalizeWords(vendor.vendor_name)}</Text>
          {vendor.vendor_description && vendor.vendor_description !== "NA" && (
            <Text style={styles.description}>
              <Text style={styles.label}></Text>
              {vendor.vendor_description}
            </Text>
          )}
          <View style={styles.iconContainer}>
            {vendor.website && (
              <TouchableOpacity onPress={() => Linking.openURL(vendor.website)}>
                <FontAwesome name="globe" size={24} color="#3b82f6" style={styles.icon} />
              </TouchableOpacity>
            )}
            {vendor.social_links?.instagram && (
              <TouchableOpacity onPress={() => Linking.openURL(vendor.social_links.instagram)}>
                <FontAwesome name="instagram" size={24} color="#C13584" style={styles.icon} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Image source={typeof logoUri === 'string' ? { uri: logoUri } : logoUri} style={styles.logo} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  vendorName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: "#444",
  },
  label: {
    fontWeight: "600",
    color: "#333",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  icon: {
    marginRight: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: "contain",
  },
});

export default VendorCard;