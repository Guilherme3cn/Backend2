import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const RADIUS = 70;

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function buildArcPath(center, radius, startAngle, endAngle) {
  const start = polarToCartesian(center, center, radius, endAngle);
  const end = polarToCartesian(center, center, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

export default function EnergyBreakdownChart({ segments, total }) {
  const processedSegments = useMemo(() => {
    if (!total || total <= 0) {
      return [];
    }

    let currentAngle = 0;

    return segments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const angle = (segment.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        return {
          ...segment,
          startAngle,
          endAngle
        };
      });
  }, [segments, total]);

  if (!processedSegments.length) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>
          Adicione dispositivos para ver o gráfico de consumo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Svg width={RADIUS * 2} height={RADIUS * 2}>
        {processedSegments.map((segment) => (
          <Path
            key={segment.id}
            d={buildArcPath(RADIUS, RADIUS, segment.startAngle, segment.endAngle)}
            fill={segment.color}
          />
        ))}
      </Svg>
      <View style={styles.legend}>
        {processedSegments.map((segment) => (
          <View style={styles.legendItem} key={segment.id}>
            <View
              style={[styles.legendSwatch, { backgroundColor: segment.color }]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.legendLabel}>{segment.label}</Text>
              <Text style={styles.legendValue}>
                {segment.value.toFixed(1)} W
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center"
  },
  legend: {
    marginTop: 16,
    width: "100%"
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8
  },
  legendLabel: {
    fontWeight: "600"
  },
  legendValue: {
    color: "#7f8c8d",
    fontSize: 12
  },
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyChartText: {
    color: "#7f8c8d",
    textAlign: "center"
  }
});
