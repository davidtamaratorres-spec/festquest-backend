const BASE_URL = "https://dishquest-backend.onrender.com";

type AnalyticsEvent = {
  dishId: string;
  event: "view_dish" | "click_reserve";
  source: "mobile";
};

export async function sendAnalyticsEvent(data: AnalyticsEvent) {
  try {
    await fetch(`${BASE_URL}/analytics/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Analytics error:", error);
  }
}


