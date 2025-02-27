import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { Image, TouchableOpacity } from "react-native";
import VendorScreen from './screens/VendorScreen';
import MenuScreen from './screens/MenuScreen';

const Stack = createStackNavigator();
const parkdayLogo = require("../assets/parkday_logo.png");

const linking = {
  prefixes: ['/'],
  config: {
    screens: {
      VendorsScreen: 'vendors',
      MenuScreen: 'menu/:vendorId',
    },
  },
};

const HeaderLogo = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('VendorsScreen')}>
      <Image
        source={parkdayLogo}
        style={{ width: 120, height: 40, resizeMode: "contain" }}
      />
    </TouchableOpacity>
  );
};

const AppNavigator = () => (
  <NavigationContainer linking={linking}>
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: () => <HeaderLogo />,
        headerTitleAlign: "center", // Center the logo in the navbar
        cardStyle: { flex: 1 },
      }}
    >
      <Stack.Screen name="VendorsScreen" component={VendorScreen} />
      <Stack.Screen name="MenuScreen" component={MenuScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;