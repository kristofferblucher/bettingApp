# Norsk Tipping API Setup

## ✅ Åpent API - Ingen nøkkel nødvendig!

Norsk Tipping sitt `/events` API er åpent og krever **ikke** autentisering! 🎉

## Slik fungerer det

API-et er allerede konfigurert og klart til bruk:

### API Endepunkt
```
GET https://api.norsk-tipping.no/OddsenGameInfo/v1/api/events/FBL
```

- **Ingen API-nøkkel**: API-et er åpent tilgjengelig
- **Sport ID**: `FBL` for fotball
- **Response**: JSON med alle kommende fotballkamper og odds

### Konfigurering

`src/config/norsktippingConfig.ts` er allerede satt opp:

```typescript
export const NT_CONFIG = {
  apiBaseUrl: 'https://api.norsk-tipping.no/OddsenGameInfo/v1/api',
  sportId: 'FBL',
  useMockData: false, // Bruker ekte NT API
};
```

### Test API-et

1. Start dev-server: `npm run dev`
2. Gå til Admin > Rediger kupong
3. Klikk "⚽ Bruk NT Verktøy"
4. Søk etter "Premier League" eller et lagnavn
5. Du skal nå se ekte kamper fra Norsk Tipping!

## API Dokumentasjon

- **API Portal**: [https://api-portal.norsk-tipping.no](https://api-portal.norsk-tipping.no)
- **API Docs**: [https://api-portal.norsk-tipping.no/docs/oddsen-shared-api-1/26jb3vz2e46wv-get-events-including-main-outright-market](https://api-portal.norsk-tipping.no/docs/oddsen-shared-api-1/26jb3vz2e46wv-get-events-including-main-outright-market)
- **Endpoint**: `GET /events/{sportId}`
- **Sport ID for fotball**: `FBL`

## Response Struktur

NT API returnerer:

```json
{
  "eventList": [
    {
      "eventId": "7776634.1",
      "homeParticipant": "Arsenal",
      "awayParticipant": "Chelsea",
      "startTime": "2025-11-20T15:00:00.000+01:00",
      "tournament": {
        "name": "England - Premier League"
      },
      "mainMarket": {
        "selections": [
          {
            "selectionValue": "H",
            "selectionName": "Arsenal",
            "selectionOdds": "2.50"
          },
          {
            "selectionValue": "D",
            "selectionName": "Uavgjort",
            "selectionOdds": "3.30"
          },
          {
            "selectionValue": "A",
            "selectionName": "Chelsea",
            "selectionOdds": "2.80"
          }
        ]
      }
    }
  ]
}
```

## Mock Data

Hvis du vil teste uten å kalle API-et, sett `useMockData: true` i config.

Mock data inkluderer:
- Premier League kamper
- La Liga kamper
- Bundesliga kamper

## Hva appen gjør

1. **Henter kamper**: Alle fotballkamper fra NT via API
2. **Filtrerer**: Basert på søkeord (lag/liga navn)
3. **Ekstraherer odds**: Hjemme/Uavgjort/Borte (H/D/A)
4. **Konverterer til poeng**: Logaritmisk formel
5. **Viser**: "Arsenal (3.0p)" i kupong-alternativene

## Feilsøking

### Ingen kamper vises
- Sjekk console for feilmeldinger
- Verifiser at API-et er tilgjengelig: [https://api.norsk-tipping.no/OddsenGameInfo/v1/api/events/FBL](https://api.norsk-tipping.no/OddsenGameInfo/v1/api/events/FBL)

### CORS-feil
- Burde ikke skje siden API-et støtter browser-kall
- Hvis det skjer, kan du sette `useMockData: true` som midlertidig løsning

