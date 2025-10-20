import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { Button } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import TuyaConnectButton from "../components/TuyaConnectButton";
import { useDevices } from "../state/DevicesContext";

const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TuyaDevicesScreen() {
  const navigation = useNavigation();
  const { addDevice, removeDevice, isAdded, updateEnergySnapshot } =
    useDevices();

  const [devices, setDevices] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState({});

  const baseUrl = useMemo(() => {
    if (!backendBaseUrl) {
      return null;
    }
    return backendBaseUrl.replace(/\/$/, "");
  }, []);

  const fetchDeviceDetails = useCallback(
    async (deviceList, resolvedUid) => {
      const withDetails = await Promise.all(
        deviceList.map(async (device) => {
          try {
            const [statusRes, energyRes] = await Promise.all([
              fetch(
                `${baseUrl}/api/tuya/status/${device.id}?uid=${encodeURIComponent(
                  resolvedUid
                )}`
              ),
              fetch(
                `${baseUrl}/api/tuya/energy/${device.id}?uid=${encodeURIComponent(
                  resolvedUid
                )}`
              )
            ]);

            if (!statusRes.ok) {
              throw new Error("Não foi possível obter status do dispositivo");
            }

            const statusPayload = await statusRes.json();

            let energyPayload = { energy: { powerW: 0, voltageV: 0, currentA: 0, ts: Date.now() } };
            let energySource = "unknown";

            if (energyRes.ok) {
              energyPayload = await energyRes.json();
              energySource =
                energyRes.headers.get("x-tuya-energy-source") ?? "unknown";
            }

            updateEnergySnapshot(device.id, {
              ...energyPayload.energy,
              source: energySource
            });

            return {
              ...device,
              on: statusPayload.status?.on ?? false,
              energy: energyPayload.energy,
              energySource
            };
          } catch (detailError) {
            console.warn("[tuya][devices-screen]", detailError);
            return {
              ...device,
              on: false,
              energy: { powerW: 0, voltageV: 0, currentA: 0, ts: Date.now() },
              energySource: "unknown"
            };
          }
        })
      );

      setDevices(withDetails);
    },
    [baseUrl, updateEnergySnapshot]
  );

  const loadDevices = useCallback(async () => {
    if (!baseUrl) {
      setError(
        "Defina EXPO_PUBLIC_BACKEND_URL no .env para conectar com o backend."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/tuya/devices`);
      if (!response.ok) {
        throw new Error("Falha ao carregar dispositivos do backend");
      }

      const payload = await response.json();
      if (!payload.devices?.length) {
        setDevices([]);
        setUid(payload.uid ?? null);
        return;
      }

      const resolvedUid = payload.uid;
      setUid(resolvedUid);
      await fetchDeviceDetails(payload.devices, resolvedUid);
    } catch (requestError) {
      console.warn("[tuya][devices]", requestError);
      setError(
        requestError?.message ?? "Não foi possível carregar os dispositivos."
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, fetchDeviceDetails]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  }, [loadDevices]);

  const handleToggle = useCallback(
    async (deviceId, nextState) => {
      if (!baseUrl) {
        Alert.alert(
          "Configuração inválida",
          "Backend não configurado. Verifique EXPO_PUBLIC_BACKEND_URL."
        );
        return;
      }

      if (!uid) {
        Alert.alert(
          "UID ausente",
          "Nenhuma conta Tuya conectada. Conclua o login primeiro."
        );
        return;
      }

      setToggling((current) => ({ ...current, [deviceId]: true }));

      try {
        const response = await fetch(
          `${baseUrl}/api/tuya/command/${deviceId}?uid=${encodeURIComponent(
            uid
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ switch: nextState ? "on" : "off" })
          }
        );

        if (!response.ok) {
          throw new Error("Não foi possível enviar comando para o dispositivo");
        }

        setDevices((current) =>
          current.map((device) =>
            device.id === deviceId ? { ...device, on: nextState } : device
          )
        );
      } catch (commandError) {
        console.warn("[tuya][toggle]", commandError);
        Alert.alert(
          "Falha ao enviar comando",
          "Tente novamente ou verifique a conexão com o backend."
        );
      } finally {
        setToggling((current) => ({ ...current, [deviceId]: false }));
      }
    },
    [baseUrl, uid]
  );

  const handleAdd = useCallback(
    (device) => {
      if (isAdded(device.id)) {
        removeDevice(device.id);
        Alert.alert("Removido", `${device.name} foi removido do app.`);
      } else {
        addDevice(device);
        Alert.alert("Adicionado", `${device.name} foi adicionado ao app.`);
      }
    },
    [addDevice, removeDevice, isAdded]
  );

  const handleOpenEnergyDetail = useCallback(
    (device) => {
      navigation.navigate("EnergyDetail", {
        deviceId: device.id,
        name: device.name,
        energy: device.energy,
        uid
      });
    },
    [navigation, uid]
  );

  const renderDevice = ({ item }) => {
    const added = isAdded(item.id);
    const toggleLoading = toggling[item.id] ?? false;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{item.name}</Text>
            <Text style={styles.deviceMeta}>
              ID: {item.id} • Categoria: {item.category}
            </Text>
            <Text style={styles.deviceMeta}>
              Status: {item.online ? "Online" : "Offline"}
            </Text>
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{item.on ? "Ligado" : "Desligado"}</Text>
            <Switch
              value={item.on}
              onValueChange={(value) => handleToggle(item.id, value)}
              disabled={!item.online || toggleLoading}
            />
          </View>
        </View>
        <View style={styles.energyRow}>
          <Text style={styles.energyValue}>
            {item.energy?.powerW?.toFixed
              ? `${item.energy.powerW.toFixed(1)} W`
              : `${item.energy?.powerW ?? 0} W`}
          </Text>
          <Text style={styles.energyMeta}>
            {item.energy?.voltageV ?? 0} V • {item.energy?.currentA ?? 0} A
          </Text>
          <Text style={styles.energySource}>
            Fonte de energia: {item.energySource}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Button
            title={added ? "Remover do app" : "Adicionar ao app"}
            onPress={() => handleAdd(item)}
          />
          <Button
            title="Ver consumo"
            onPress={() => handleOpenEnergyDetail(item)}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Integração Tuya</Text>
        <Text style={styles.subtitle}>
          Conecte sua conta Tuya para acessar dispositivos, estado em tempo real
          e consumo de energia.
        </Text>
        <TuyaConnectButton />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Carregando dispositivos…</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text>Nenhum dispositivo encontrado.</Text>
              <Text style={styles.emptyStateHint}>
                Conecte-se à Tuya e atualize para listar seus dispositivos.
              </Text>
            </View>
          }
          contentContainerStyle={
            devices.length === 0 && !loading ? styles.emptyList : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa"
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomColor: "#e0e6ed",
    borderBottomWidth: 1
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: "#5c6c80",
    marginBottom: 12
  },
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffecec"
  },
  errorText: {
    color: "#c0392b"
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "600"
  },
  deviceMeta: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2
  },
  switchContainer: {
    alignItems: "flex-end"
  },
  switchLabel: {
    fontSize: 12,
    color: "#5c6c80",
    marginBottom: 4
  },
  energyRow: {
    marginBottom: 12
  },
  energyValue: {
    fontSize: 16,
    fontWeight: "600"
  },
  energyMeta: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4
  },
  energySource: {
    fontSize: 11,
    color: "#95a5a6",
    marginTop: 2
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  emptyState: {
    marginTop: 48,
    alignItems: "center"
  },
  emptyStateHint: {
    marginTop: 8,
    color: "#7f8c8d"
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center"
  }
});
