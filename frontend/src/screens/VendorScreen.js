import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import VendorCard from "../components/VendorCard";
import { getVendors, addVendor } from "../services/api";

const VendorScreen = ({ navigation }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorWebsite, setVendorWebsite] = useState("");
  const [vendorMenuUrl, setVendorMenuUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorColors, setVendorColors] = useState({});

  // Function to generate a random color from a predefined set of colors
  const getRandomColor = () => {
    const colors = ["#F8D7DA", "#D1ECF1", "#D4EDDA", "#FFF3CD"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const resetModalFields = () => {
    setVendorName("");
    setVendorWebsite("");
    setVendorMenuUrl("");
  };
  // Fetch vendors when the component mounts
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await getVendors();
        // Handle case where no vendors are found
        if (!Array.isArray(data) || data.length === 0) {
          setError("No vendors found! Add a vendor to get started.");
        } else {
          setVendors(data);

          // Generate and set colors for each vendor
          const colors = {};
          data.forEach(vendor => {
            colors[vendor.vendor_name] = getRandomColor();
          });
          setVendorColors(colors);
        }
      } catch (err) {
        console.error("Error fetching vendors:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const handleAddVendor = async () => {
    // Validate that all fields are filled before submitting
    if (!vendorName || !vendorWebsite || !vendorMenuUrl) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const newVendor = await addVendor(vendorName, vendorWebsite, vendorMenuUrl);
      Alert.alert("Success", "Vendor added successfully!");
      setVendors((prevVendors) => {
        const updatedVendors = [...prevVendors, newVendor];
        // Generate and set color for the new vendor
        setVendorColors((prevColors) => ({
          ...prevColors,
          [newVendor.vendor_name]: getRandomColor(),
        }));
        return updatedVendors;
      });
      setError(""); // Clear the error message
      setModalVisible(false);
      resetModalFields(); // Reset modal fields after adding a vendor
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to add vendor. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };  // Set up the header button to add a new vendor
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Vendor</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Show loading indicator while fetching vendors
  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {vendors.length === 0 && !error ? (
        <Text style={styles.noVendorsText}>No vendors yet! Get started by adding a vendor.</Text>
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.vendor_name}
          renderItem={({ item }) => (
            <VendorCard vendor={item} color={vendorColors[item.vendor_name]} onPress={() => navigation.navigate("MenuScreen", { vendorId: item.id })} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      )}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Vendor</Text>
            <TextInput placeholder="Vendor Name" style={styles.input} value={vendorName} onChangeText={setVendorName} />
            <TextInput placeholder="Vendor Website" style={styles.input} value={vendorWebsite} onChangeText={setVendorWebsite} />
            <TextInput placeholder="Vendor Menu URL" style={styles.input} value={vendorMenuUrl} onChangeText={setVendorMenuUrl} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddVendor} style={[styles.saveButton, isSubmitting && styles.disabledButton]} disabled={isSubmitting}>
                <Text style={styles.buttonText}>{isSubmitting ? "Adding..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  noVendorsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#000",
  },
  listContent: {
    paddingBottom: 20,
  },
  addButton: {
    marginRight: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "#aaa",
    padding: 12,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginRight: 5,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginLeft: 5,
  },
  disabledButton: {
    backgroundColor: "#aaa",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default VendorScreen;