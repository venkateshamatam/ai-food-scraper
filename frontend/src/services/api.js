const BASE_URL = "http://localhost:3000";

export const getVendors = async () => {
  try {
    const response = await fetch(`${BASE_URL}/vendors`);
    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }
};

export const getVendorDetails = async (vendorId) => {
  try {
    console.log(`Fetching details for vendor ID: ${vendorId}`);  // Debugging Log
    const response = await fetch(`${BASE_URL}/vendors/${vendorId}`);

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

    const data = await response.json();
    console.log("Vendor API Response:", data); // Debugging Log
    return data;
  } catch (error) {
    console.error(`Error fetching vendor details for ${vendorId}:`, error);
    return null;  // Return null if there’s an error
  }
};


export const getMealsByVendor = async (vendorId) => {
  try {
    console.log(`Fetching meals for vendor ID: ${vendorId}`);  // Debugging Log
    const response = await fetch(`${BASE_URL}/vendors/${vendorId}/meals`);
    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const data = await response.json();
    console.log("API Response:", data); // Debugging Log
    return data;
  } catch (error) {
    console.error(`Error fetching meals for vendor ${vendorId}:`, error);
    return [];
  }
};

export const addVendor = async (vendor_name, website, menu_url) => {
  try {
    const response = await fetch(`${BASE_URL}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_name, website, menu_url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to add vendor");
    }

    return response.json();
  } catch (error) {
    console.error("Error adding vendor:", error);
    throw error;
  }
};
