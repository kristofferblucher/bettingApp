# Implementer PIN Authentication System

## 1. Database Setup

### Opprett players tabell og modifiser submissions

Lag SQL-fil `setup_player_auth.sql` med:

```sql
-- Opprett players tabell
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_code text UNIQUE NOT NULL CHECK (player_code ~ '^\d{4}$'),
  player_name text NOT NULL,
  device_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Legg til player_id i submissions
ALTER TABLE submissions 
  ADD COLUMN player_id uuid REFERENCES players(id);

-- Indekser for ytelse
CREATE INDEX idx_players_code ON players(player_code);
CREATE INDEX idx_submissions_player_id ON submissions(player_id);
CREATE INDEX idx_players_device_ids ON players USING gin(device_ids);

-- RLS policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all users" ON players FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON players FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON players FOR UPDATE TO public USING (true);
```

## 2. TypeScript Interfaces

### Oppdater `src/interfaces/interfaces.tsx`

Legg til:

```typescript
export interface Player {
  id: string;
  player_code: string;
  player_name: string;
  device_ids: string[];
  created_at: string;
}

export interface Submission {
  id: number;
  coupon_id: number;
  device_id: string;
  player_id?: string;  // Legg til denne
  player_name?: string;
  answers: Record<number, string>;
  created_at: string;
  is_winner?: boolean;
}
```

## 3. Player Utility Functions

### Opprett `src/utils/playerUtils.tsx`

```typescript
import { supabase } from "../database/supabaseClient";
import { getDeviceId } from "./deviceUtils";
import type { Player } from "../interfaces/interfaces";

export const getPlayerId = (): string | null => {
  return localStorage.getItem("player_id");
};

export const setPlayerId = (playerId: string): void => {
  localStorage.setItem("player_id", playerId);
};

export const clearPlayerId = (): void => {
  localStorage.removeItem("player_id");
};

export const createPlayer = async (playerName: string, playerCode: string): Promise<{ player: Player | null; error: any }> => {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from("players")
    .insert([{
      player_name: playerName.trim(),
      player_code: playerCode,
      device_ids: [deviceId]
    }])
    .select()
    .single();

  if (error) return { player: null, error };

  // Koble alle eksisterende submissions fra denne device_id til ny player
  await supabase
    .from("submissions")
    .update({ player_id: data.id, player_name: playerName.trim() })
    .eq("device_id", deviceId);

  setPlayerId(data.id);
  return { player: data, error: null };
};

export const loginPlayer = async (playerCode: string): Promise<{ player: Player | null; error: any }> => {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("player_code", playerCode)
    .maybeSingle();

  if (error) return { player: null, error };
  if (!data) return { player: null, error: { message: "Feil PIN-kode" } };

  // Legg til denne device_id til spillerens device_ids array (hvis ikke allerede der)
  if (!data.device_ids.includes(deviceId)) {
    await supabase
      .from("players")
      .update({ device_ids: [...data.device_ids, deviceId] })
      .eq("id", data.id);
  }

  // Koble eventuelle submissions fra denne device_id til spilleren
  await supabase
    .from("submissions")
    .update({ player_id: data.id, player_name: data.player_name })
    .eq("device_id", deviceId)
    .is("player_id", null);

  setPlayerId(data.id);
  return { player: data, error: null };
};

export const getCurrentPlayer = async (): Promise<Player | null> => {
  const playerId = getPlayerId();
  if (!playerId) return null;

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (error || !data) {
    clearPlayerId();
    return null;
  }

  return data;
};
```

## 4. PlayerGate Komponent

### Opprett `src/components/Auth/PlayerGate.tsx`

Ny komponent som viser login/registrering:

- To tabs: "Opprett konto" og "Logg inn"
- Opprett konto: Input for navn + 4-sifret PIN (to ganger for bekreftelse)
- Logg inn: Input for 4-sifret PIN
- Validering: PIN må være eksakt 4 siffer
- Feilhåndtering med toast-meldinger
- Ved suksess: Kaller `onSuccess()` callback

Layout:

```typescript
import { useState } from "react";
import {
  Box, Button, Card, CardBody, Heading, Input, VStack, 
  Tabs, TabList, TabPanels, Tab, TabPanel, FormControl, 
  FormLabel, Text, PinInput, PinInputField, HStack, useToast
} from "@chakra-ui/react";
import { createPlayer, loginPlayer } from "../../utils/playerUtils";

interface PlayerGateProps {
  onSuccess: () => void;
}

export default function PlayerGate({ onSuccess }: PlayerGateProps) {
  // Implementer: 
  // - Tab-basert UI (Opprett/Logg inn)
  // - Navn input for ny bruker
  // - PinInput for 4-sifret kode
  // - Bekreft PIN for nye brukere
  // - Call createPlayer() eller loginPlayer()
  // - onSuccess() når autentisert
}
```

## 5. Oppdater App.tsx

### Modifiser `src/App.tsx`

Legg til player authentication gate:

```typescript
import { useState, useEffect } from "react";
import PlayerGate from "./components/Auth/PlayerGate";
import { getPlayerId, getCurrentPlayer } from "./utils/playerUtils";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const player = await getCurrentPlayer();
    setIsAuthenticated(!!player);
    setIsCheckingAuth(false);
  };

  if (isCheckingAuth) {
    return <Center h="100vh"><Spinner size="xl" /></Center>;
  }

  if (!isAuthenticated) {
    return <PlayerGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Eksisterende app-innhold her...
}
```

## 6. Oppdater ActiveCouponView

### Modifiser `src/components/User/ActiveCouponView.tsx`

Erstatt device_id-logikk med player_id:

- Fjern `playerName` state (hent fra player-objekt)
- Erstatt `deviceId` med `playerId` i submissions
- Linje 30: Endre fra `const deviceId = getDeviceId()` til `const playerId = getPlayerId()`
- Linje 46: Endre query fra `.eq("device_id", deviceId)` til `.eq("player_id", playerId)`
- Linje 138-147: Fjern synkronisering av player_name (ikke lenger nødvendig)
- Linje 189: Endre `device_id: deviceId` til `player_id: playerId`
- Fjern Input-felt for playerName (vises automatisk fra player-objekt)

## 7. Oppdater ActiveCouponList

### Modifiser `src/components/User/ActiveCouponList.tsx`

- Linje 27: Erstatt `const deviceId = getDeviceId()` med `const playerId = getPlayerId()`
- Linje 48 og 82: Endre queries fra `.eq("device_id", deviceId)` til `.eq("player_id", playerId)`

## 8. Oppdater Statistikk

### Modifiser `src/utils/statsUtils.tsx`

Allerede bruker device_id som identifier, men bør oppdateres til player_id:

- Linje 91-96: Endre fra `const deviceId = sub.device_id` til `const playerId = sub.player_id || sub.device_id` (fallback for gamle data)
- Linje 104-114: Hent player_name fra players-tabell basert på player_id

## 9. Admin Panel - Spilleroversikt

### Opprett `src/components/Admin/PlayerManagement.tsx` (valgfri forbedring)

Viser alle spillere med mulighet til å:

- Se alle spillere med navn og PIN
- Merge duplikater manuelt
- Se hvilke device_ids som er koblet til hver spiller

## 10. Testing og Validering

Verifiser at:

1. Ny bruker kan opprette konto (navn + PIN)
2. Eksisterende submissions fra device_id knyttes til ny player
3. Samme bruker kan logge inn på ny enhet med PIN
4. Statistikk aggregeres riktig per player_id
5. Admin kan fortsatt se alle resultater