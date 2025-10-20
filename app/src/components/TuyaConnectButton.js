import React, { useCallback } from "react";
import { Alert, Button } from "react-native";
import * as Linking from "expo-linking";

const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TuyaConnectButton() {
  const handleConnect = useCallback(() => {
    if (!backendBaseUrl) {
      Alert.alert(
        "Configuração necessária",
        "Defina EXPO_PUBLIC_BACKEND_URL no arquivo .env para continuar."
      );
      return;
    }

    const normalizedBase = backendBaseUrl.replace(/\/$/, "");
    const loginUrl = `${normalizedBase}/api/tuya/login`;

    Linking.openURL(loginUrl).catch((error) => {
      console.warn("Erro ao abrir URL Tuya", error);
      Alert.alert(
        "Não foi possível abrir o login",
        "Verifique a URL do backend ou tente novamente em instantes."
      );
    });
  }, []);

  return <Button title="Conectar Tuya" onPress={handleConnect} />;
}
