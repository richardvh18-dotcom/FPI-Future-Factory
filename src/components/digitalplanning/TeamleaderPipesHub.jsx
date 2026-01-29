import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import TeamleaderHub from "./TeamleaderHub";
import { Loader2 } from "lucide-react";

/**
 * TeamleaderPipesHub - Dynamische versie (Path Fix)
 */
const TeamleaderPipesHub = (props) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const appId = typeof __app_id !== "undefined" ? __app_id : "fittings-app-v1";

  useEffect(() => {
    // PAD FIX: Gebruik 6 segmenten
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "config",
      "factory_config"
    );

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const myDept = (data.departments || []).find(
            (d) => d.slug === "pipes"
          );
          if (myDept) {
            setStations(myDept.stations || []);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Fout:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId]);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  const machineIds = stations.map((s) => s.name);

  return (
    <TeamleaderHub
      {...props}
      fixedScope="pipe"
      departmentName="Pipe Productions"
      allowedMachines={machineIds}
    />
  );
};

export default TeamleaderPipesHub;
