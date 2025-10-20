import React, { useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { DevicesProvider } from "./src/state/DevicesContext";
import TuyaDevicesScreen from "./src/screens/TuyaDevicesScreen";
import EnergyDetailScreen from "./src/screens/EnergyDetailScreen";

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [Linking.createURL("/"), "myapp://"],
  config: {
    screens: {
      TuyaDevices: "tuya/callback",
      EnergyDetail: "tuya/energy/:deviceId"
    }
  }
};

export default function App() {
  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url?.includes("tuya/callback")) {
        Alert.alert("Tuya", "Conta conectada! Buscando dispositivos…");
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <DevicesProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator>
          <Stack.Screen
            name="TuyaDevices"
            component={TuyaDevicesScreen}
            options={{ title: "Dispositivos Tuya" }}
          />
          <Stack.Screen
            name="EnergyDetail"
            component={EnergyDetailScreen}
            options={({ route }) => ({
              title: route.params?.name
                ? `Consumo • ${route.params.name}`
                : "Consumo de Energia"
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </DevicesProvider>
  );
}
