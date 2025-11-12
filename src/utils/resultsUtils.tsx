// Utility for å trigge oppdatering av resultater på tvers av komponenter

const RESULTS_UPDATE_KEY = "results_last_update";

/**
 * Kaller denne når admin bekrefter/oppdaterer fasit
 * Dette trigger en oppdatering i ResultsView
 */
export function notifyResultsUpdate(couponId: number) {
  const timestamp = Date.now();
  const data = JSON.stringify({ couponId, timestamp });
  
  // Lagre i localStorage
  localStorage.setItem(RESULTS_UPDATE_KEY, data);
  
  // Dispatch custom event for samme tab
  window.dispatchEvent(new CustomEvent("resultsUpdated", { 
    detail: { couponId, timestamp } 
  }));
  
  console.log("📢 Resultat-oppdatering sendt for kupong:", couponId);
}

/**
 * Lytt på resultat-oppdateringer
 * @param callback - Funksjon som kalles når fasit oppdateres
 * @returns cleanup function
 */
export function onResultsUpdate(callback: (couponId: number) => void) {
  // Lytter på custom event (samme tab)
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail.couponId);
  };
  
  // Lytter på storage event (andre tabs/vinduer)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === RESULTS_UPDATE_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        callback(data.couponId);
      } catch (err) {
        console.error("Feil ved parsing av resultat-event:", err);
      }
    }
  };
  
  window.addEventListener("resultsUpdated", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);
  
  // Cleanup function
  return () => {
    window.removeEventListener("resultsUpdated", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

