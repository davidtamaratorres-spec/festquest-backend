import AsyncStorage from "@react-native-async-storage/async-storage";

type DemandRecord = {
  query: string;
  city: string | null;
  timestamp: number;
};

const STORAGE_KEY = "dishquest_demand_log";

async function getStoredLog(): Promise<DemandRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function logDemand(query: string, city: string | null) {
  if (!query.trim()) return;

  const log = await getStoredLog();

  log.push({
    query: query.toLowerCase(),
    city,
    timestamp: Date.now(),
  });

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export async function getDemandSummary() {
  const log = await getStoredLog();

  const map: Record<
    string,
    { count: number; city: string | null }
  > = {};

  log.forEach((d) => {
    const key = `${d.query}-${d.city ?? "todas"}`;
    if (!map[key]) {
      map[key] = { count: 0, city: d.city };
    }
    map[key].count += 1;
  });

  return Object.entries(map)
    .map(([key, value]) => {
      const [query] = key.split("-");
      return {
        query,
        city: value.city,
        count: value.count,
      };
    })
    .sort((a, b) => b.count - a.count);
}

