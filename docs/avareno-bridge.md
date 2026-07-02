# Avareno Bridge

Status: local bridge foundation, 2026-07-02. Not production-ready connector infrastructure.

## Goal

Avareno Bridge is the planned local helper that lets Avareno use one local smart-home source, especially Home Assistant, instead of asking users to connect every device vendor separately.

Target user flow:

1. User starts Avareno Bridge locally.
2. Bridge finds Home Assistant or uses `HOME_ASSISTANT_URL`.
3. User authorizes Home Assistant locally.
4. Avareno imports a preview of device/entity metadata.
5. User confirms which devices become Avareno smart objects.

## Current MVP

The current bridge is a small local Python service:

```powershell
py -3 bridge/avareno_bridge.py
```

Default URL:

```text
http://127.0.0.1:8765
```

Available local endpoints:

```text
GET /health
GET /discover/home-assistant
GET /home-assistant/entities
```

Home Assistant environment variables for local testing:

```text
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=<long-lived-access-token-for-local-testing>
```

Avareno backend local test variables:

```text
AVARENO_ENABLE_LOCAL_BRIDGE=1
AVARENO_BRIDGE_URL=http://127.0.0.1:8765
```

Direct bridge polling is blocked in production. Production should use a paired outbound bridge or Home Assistant OAuth-style flow, not a cloud backend reaching into private LAN addresses.

## Home Assistant Setup TODO

Use this checklist when setting up the first real Home Assistant test environment for Avareno Bridge.

### 1. Choose A Home Assistant Install Path

Recommended MVP path:

- Use Home Assistant Green if you want the lowest-friction setup. It is a plug-and-play hub with Home Assistant already installed.
- Use Raspberry Pi, mini PC, server or VM only if you already have hardware and are comfortable installing an OS image.

Official references:

- Home Assistant installation overview: `https://www.home-assistant.io/installation/`
- Home Assistant Green: `https://www.home-assistant.io/green/`
- Raspberry Pi installation: `https://www.home-assistant.io/installation/raspberrypi/`

### 2. Bring Home Assistant Online

For Home Assistant Green:

- Plug in network cable.
- Plug in power.
- Wait until Home Assistant is reachable in the browser.

For Raspberry Pi:

- Install Raspberry Pi Imager.
- Choose `Other specific-purpose OS > Home automation > Home Assistant`.
- Select the Home Assistant OS image matching the Raspberry Pi model.
- Write the image to the SD card.
- Boot the Raspberry Pi on the same network as the development machine.

Expected local URLs to try:

```text
http://homeassistant.local:8123
http://homeassistant:8123
http://<local-ip-address>:8123
```

### 3. Create A Home Assistant Access Token

- Open the Home Assistant web UI.
- Log in with the local owner/admin account.
- Open the user profile page.
- Create a Long-Lived Access Token for `Avareno Bridge`.
- Copy the token once and store it only in `bridge/.env.local`.

Do not paste this token into frontend code, screenshots, issue comments, analytics, AI prompts or public support channels.

Official references:

- Home Assistant authentication: `https://www.home-assistant.io/docs/authentication/`
- Home Assistant REST API token note: `https://developers.home-assistant.io/docs/api/rest`

### 4. Configure Avareno Bridge Locally

Create `bridge/.env.local`:

```env
HOME_ASSISTANT_URL=http://<local-home-assistant-ip-or-hostname>:8123
HOME_ASSISTANT_TOKEN=<long-lived-access-token>
AVARENO_BRIDGE_HOST=127.0.0.1
AVARENO_BRIDGE_PORT=8765
```

Start or restart the bridge:

```powershell
powershell -ExecutionPolicy Bypass -File bridge/start-avareno-bridge.ps1
```

Test bridge health:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

Test Home Assistant config status:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/home-assistant/status
```

Expected result:

```json
{"urlConfigured":true,"tokenConfigured":true}
```

Test entity preview:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/home-assistant/entities
```

### 5. Configure Avareno Backend For Local Bridge Testing

In `backend/.env.local`:

```env
AVARENO_ENABLE_LOCAL_BRIDGE=1
AVARENO_BRIDGE_URL=http://127.0.0.1:8765
```

Restart the backend after changing env values.

Test backend visibility:

```powershell
Invoke-RestMethod http://127.0.0.1:4001/api/smart-home
```

Expected result:

- Provider `AVARENO_BRIDGE` is available.
- Provider `HOME_ASSISTANT` shows `tokenConfigured: true`.
- Sync can import reduced Home Assistant entity metadata into Avareno smart-home devices.

### 6. Privacy And Security Checks Before Real Users

- Keep the Home Assistant token local and server-side only.
- Do not expose the token in frontend code.
- Do not log raw Home Assistant payloads.
- Import only metadata needed for device identity, room, state and capabilities.
- Add disconnect/delete behavior before production.
- Replace direct local polling with a paired outbound bridge before cloud production.
- Document Home Assistant as a connector/subprocessor decision if cloud relay behavior is added.

## Data Minimization

The MVP bridge returns reduced Home Assistant entity metadata only:

- entity id
- friendly name
- domain/type
- state
- selected safe attributes
- inferred capabilities

It does not return Home Assistant tokens to Avareno frontend code. It does not push raw Home Assistant payloads to the cloud.

## Production Requirements

Before public use:

- guided installer or Home Assistant add-on
- OAuth or scoped local authorization
- encrypted token storage
- pairing code between user account and bridge
- outbound-only sync from bridge to Avareno backend
- disconnect and token revocation
- safe sync logs
- rate limits and retry limits
- no raw provider payloads in logs
- privacy/legal review for Home Assistant and any cloud relay behavior
