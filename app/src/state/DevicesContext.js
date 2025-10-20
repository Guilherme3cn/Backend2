import React, { createContext, useContext, useMemo, useState } from "react";

const DevicesContext = createContext(undefined);

export function DevicesProvider({ children }) {
  const [addedDevices, setAddedDevices] = useState([]);
  const [energyByDevice, setEnergyByDevice] = useState({});

  const generateColor = (index) => {
    const palette = [
      "#1abc9c",
      "#3498db",
      "#9b59b6",
      "#e67e22",
      "#e74c3c",
      "#2ecc71",
      "#f1c40f"
    ];
    return palette[index % palette.length];
  };

  const addDevice = (device) => {
    setAddedDevices((current) => {
      const alreadyAdded = current.some((item) => item.id === device.id);
      if (alreadyAdded) {
        return current;
      }
      return [
        ...current,
        {
          ...device,
          color: device.color ?? generateColor(current.length)
        }
      ];
    });
  };

  const removeDevice = (deviceId) => {
    setAddedDevices((current) =>
      current.filter((device) => device.id !== deviceId)
    );
    setEnergyByDevice((current) => {
      const next = { ...current };
      delete next[deviceId];
      return next;
    });
  };

  const updateEnergySnapshot = (deviceId, snapshot) => {
    setEnergyByDevice((current) => ({
      ...current,
      [deviceId]: snapshot
    }));
  };

  const contextValue = useMemo(() => {
    const totalPower = Object.values(energyByDevice).reduce(
      (acc, item) => acc + (item?.powerW ?? 0),
      0
    );

    const pieSegments = addedDevices.map((device) => {
      const energy = energyByDevice[device.id];
      const value = energy?.powerW ?? 0;
      return {
        id: device.id,
        label: device.name,
        value,
        color: device.color
      };
    });

    return {
      addedDevices,
      addDevice,
      removeDevice,
      isAdded: (deviceId) =>
        addedDevices.some((device) => device.id === deviceId),
      updateEnergySnapshot,
      energyByDevice,
      totalPower,
      pieSegments
    };
  }, [addedDevices, energyByDevice]);

  return (
    <DevicesContext.Provider value={contextValue}>
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevices() {
  const context = useContext(DevicesContext);
  if (!context) {
    throw new Error("useDevices must be used within DevicesProvider");
  }
  return context;
}
