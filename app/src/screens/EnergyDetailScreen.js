import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRoute } from "@react-navigation/native";
import EnergyBreakdownChart from "../components/EnergyBreakdownChart";
import { useDevices } from "../state/DevicesContext";

const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EnergyDetailScreen() {
  const route = useRoute();
  const params = route.params ?? {};
  const { deviceId, name, uid } = params;

  const {
    updateEnergySnapshot,
    energyByDevice,
    pieSegments,
    totalPower
  } = useDevices();

  const initialEnergy = params.energy;

  const [energy, setEnergy] = useState(initialEnergy);
  const [source, setSource] = useState(initialEnergy?.source ?? "unknown");
  const [loading, setLoading] = useState(false);

  const baseUrl = backendBaseUrl ? backendBaseUrl.replace(/\/$/, "") : null;
  const storedEnergy = energyByDevice[deviceId];

  useEffect(() => {
    if (!energy && storedEnergy) {
      setEnergy(storedEnergy);
      setSource(storedEnergy.source ?? "unknown");
    }
  }, [energy, storedEnergy]);

  const fetchEnergy = useCallback(async () => {
    if (!baseUrl) {
      Alert.alert(
        "Configuração necessária",
        "Defina EXPO_PUBLIC_BACKEND_URL no .env."
      );
      return;
    }

    if (!deviceId) {
      Alert.alert("Dispositivo não informado");
      return;
    }

    setLoading(true);

    try {
      const queryUid = uid ? `?uid=${encodeURIComponent(uid)}` : "";
      const response = await fetch(
        `${baseUrl}/api/tuya/energy/${deviceId}${queryUid}`
      );

      if (!response.ok) {
        throw new Error("Falha ao obter consumo do dispositivo");
      }

      const payload = await response.json();
      const nextEnergy = {
        ...payload.energy,
        source: response.headers.get("x-tuya-energy-source") ?? "unknown"
      };

      setEnergy(nextEnergy);
      setSource(nextEnergy.source);
      updateEnergySnapshot(deviceId, nextEnergy);
    } catch (requestError) {
      console.warn("[tuya][energy-detail]", requestError);
      Alert.alert(
        "Não foi possível atualizar",
        "Verifique a conexão com o backend e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, deviceId, uid, updateEnergySnapshot]);

  useEffect(() => {
    if (!energy) {
      fetchEnergy();
    }
  }, [energy, fetchEnergy]);

  const lastUpdated = energy?.ts
    ? new Date(energy.ts).toLocaleString()
    : "Não disponível";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{name ?? "Dispositivo"}</Text>
        <Text style={styles.subtitle}>ID: {deviceId}</Text>
      </View>

      <View style={styles.metricsCard}>
        <Text style={styles.metricsTitle}>Consumo atual</Text>
        {energy ? (
          <>
            <Text style={styles.metricValue}>
              {energy.powerW ? energy.powerW.toFixed(2) : "0.00"} W
            </Text>
            <Text style={styles.metricRow}>
              {energy.voltageV ?? 0} V • {energy.currentA ?? 0} A
            </Text>
            <Text style={styles.metricTimestamp}>Atualizado em: {lastUpdated}</Text>
            <Text style={styles.metricSource}>Fonte: {source}</Text>
          </>
        ) : (
          <Text style={styles.metricRow}>
            Nenhum dado de consumo disponível para este dispositivo.
          </Text>
        )}
        <View style={styles.refreshButton}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Button title="Atualizar consumo" onPress={fetchEnergy} />
          )}
        </View>
      </View>

      {source === "mock" && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Dados simulados</Text>
          <Text style={styles.noticeText}>
            Este dispositivo não fornece métricas de energia em tempo real.
            Exibindo valores simulados para fins de demonstração.
          </Text>
        </View>
      )}

      <View style={styles.chartCard}>
        <Text style={styles.metricsTitle}>Distribuição dos dispositivos adicionados</Text>
        <EnergyBreakdownChart segments={pieSegments} total={totalPower} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f7fa"
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600"
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d"
  },
  metricsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2ecc71"
  },
  metricRow: {
    marginTop: 4,
    fontSize: 14,
    color: "#34495e"
  },
  metricTimestamp: {
    marginTop: 8,
    fontSize: 12,
    color: "#95a5a6"
  },
  metricSource: {
    marginTop: 4,
    fontSize: 12,
    color: "#95a5a6"
  },
  refreshButton: {
    marginTop: 16,
    alignSelf: "flex-start"
  },
  notice: {
    backgroundColor: "#fffae6",
    padding: 12,
    borderRadius: 8,
    borderColor: "#ffe58f",
    borderWidth: 1,
    marginBottom: 16
  },
  noticeTitle: {
    fontWeight: "600",
    marginBottom: 4
  },
  noticeText: {
    color: "#7f8c8d",
    fontSize: 13
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 32
  }
});
