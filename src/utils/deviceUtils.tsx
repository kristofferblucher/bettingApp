
export function getDeviceId(): string {
    let id = localStorage.getItem("device_id");
  
    // generer ny id, hvis det ikke eksisterer
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
    }
  
    return id;
  }
  