# CLAUDE.md - Overwatch

## Project Overview

**Overwatch** is a real-time collaborative Common Operational Picture (COP) platform—essentially a live minimap for situational awareness in both military and civilian contexts. Think of it as "Google Docs for maps": when one operative draws, marks, or annotates the map, every connected user sees the change instantly.

### Core Capabilities
- Real-time collaborative drawing and annotation (CRDT-based, conflict-free)
- High-performance vector tile rendering for large-scale deployments
- Multi-layer operational overlays (units, routes, zones, threats)
- Offline-first architecture with sync-on-reconnect
- Role-based access control for sensitive operational data

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **MapLibre GL JS** | 5.x | Core map rendering engine (WebGL-based, open-source) |
| **Deck.gl** | 9.x | High-performance data visualization layers (WebGL2) |
| **Yjs** | 13.x | CRDT library for real-time collaboration |
| **React** | 19.x | UI framework |
| **Vite** | 6.x | Build tooling |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Hocuspocus** | 2.x | Yjs WebSocket server with persistence |
| **Martin** | 0.15.x | High-performance Rust-based vector tile server |
| **PostgreSQL** | 16.x | Primary database |
| **PostGIS** | 3.4.x | Spatial extensions for PostgreSQL |
| **Redis** | 7.x | Pub/sub for multi-instance sync, caching |

### Infrastructure
- **Docker Compose** for local development
- **Nginx** for production reverse proxy and static asset serving

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Browser  │  │ Browser  │  │ Browser  │  │  Mobile  │            │
│  │ Client A │  │ Client B │  │ Client C │  │  (PWA)   │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │             │                    │
│       └─────────────┴──────┬──────┴─────────────┘                    │
│                            │                                         │
│              ┌─────────────┴─────────────┐                          │
│              │    WebSocket + HTTP/2     │                          │
│              └─────────────┬─────────────┘                          │
└────────────────────────────┼────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────┐
│                      EDGE / GATEWAY                                  │
│              ┌─────────────┴─────────────┐                          │
│              │          Nginx            │                          │
│              │   (TLS, Load Balancing)   │                          │
│              └──┬──────────┬──────────┬──┘                          │
│                 │          │          │                              │
└─────────────────┼──────────┼──────────┼─────────────────────────────┘
                  │          │          │
┌─────────────────┼──────────┼──────────┼─────────────────────────────┐
│              SERVICES      │          │                              │
│  ┌──────────────┴───┐  ┌───┴────────────┐  ┌───┴──────────────┐    │
│  │   Hocuspocus     │  │     Martin      │  │   API Server     │    │
│  │  (Yjs Sync +     │  │  (Vector Tiles) │  │   (REST/gRPC)    │    │
│  │   Persistence)   │  │                 │  │                  │    │
│  └────────┬─────────┘  └────────┬────────┘  └────────┬─────────┘    │
│           │                     │                    │               │
│           └─────────────────────┴────────────────────┘               │
│                                 │                                    │
│              ┌──────────────────┴──────────────────┐                │
│              │              Redis                  │                │
│              │    (Pub/Sub, Session Cache)         │                │
│              └──────────────────┬──────────────────┘                │
│                                 │                                    │
│              ┌──────────────────┴──────────────────┐                │
│              │      PostgreSQL + PostGIS           │                │
│              │   (Spatial Data, Yjs Documents)     │                │
│              └─────────────────────────────────────┘                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Map Tiles**: Client → Nginx → Martin → PostGIS (cached at Nginx/Redis)
2. **Collaborative Edits**: Client ↔ Hocuspocus (WebSocket) → PostgreSQL (persistence)
3. **Operational Data**: Client ↔ API Server → PostGIS

---

## Project Structure

```
overwatch/
├── CLAUDE.md                    # This file
├── docker-compose.yml           # Local development stack
├── docker-compose.prod.yml      # Production configuration
│
├── client/                      # Frontend application
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── sprites/            # Map icon sprites
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Map/
│       │   │   ├── MapContainer.tsx      # MapLibre + Deck.gl integration
│       │   │   ├── CollaborativeLayer.tsx # Yjs-synced annotations
│       │   │   ├── UnitsLayer.tsx        # Force tracking overlay
│       │   │   └── DrawingTools.tsx      # Annotation toolbar
│       │   ├── Sidebar/
│       │   │   ├── LayerPanel.tsx
│       │   │   └── UnitList.tsx
│       │   └── shared/
│       ├── hooks/
│       │   ├── useYjs.ts                 # Yjs provider hook
│       │   ├── useMapLibre.ts
│       │   └── useDeckLayers.ts
│       ├── stores/
│       │   ├── mapStore.ts               # Zustand store for map state
│       │   └── collaborationStore.ts
│       ├── lib/
│       │   ├── yjs/
│       │   │   ├── provider.ts           # HocuspocusProvider setup
│       │   │   └── awareness.ts          # Cursor presence
│       │   ├── map/
│       │   │   ├── styles.ts             # MapLibre style definitions
│       │   │   └── layers.ts             # Deck.gl layer factories
│       │   └── geo/
│       │       └── utils.ts              # GeoJSON helpers
│       ├── types/
│       │   ├── operational.ts            # COP domain types
│       │   └── collaboration.ts
│       └── styles/
│           └── globals.css
│
├── server/                      # Backend services
│   ├── hocuspocus/             # Collaboration server
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── extensions/
│   │   │   │   ├── postgres.ts          # PostgreSQL persistence
│   │   │   │   └── auth.ts              # Token validation
│   │   │   └── hooks/
│   │   │       └── onLoadDocument.ts
│   │   └── Dockerfile
│   │
│   └── api/                    # REST API (optional, for non-realtime ops)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   ├── units.ts
│       │   │   └── layers.ts
│       │   └── db/
│       │       └── queries.ts
│       └── Dockerfile
│
├── martin/                     # Vector tile server config
│   ├── config.yaml             # Martin configuration
│   └── Dockerfile
│
├── db/                         # Database migrations and seeds
│   ├── migrations/
│   │   ├── 001_enable_postgis.sql
│   │   ├── 002_create_layers.sql
│   │   ├── 003_create_features.sql
│   │   └── 004_create_yjs_documents.sql
│   └── seeds/
│       └── sample_data.sql
│
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.conf
│   └── ssl/                    # TLS certificates (gitignored)
│
└── scripts/
    ├── setup.sh                # Initial setup script
    └── import-osm.sh           # OpenStreetMap data import
```

---

## Development Guidelines

### Getting Started

```bash
# Clone and setup
git clone <repo-url> overwatch
cd overwatch
./scripts/setup.sh

# Start all services
docker-compose up -d

# Start frontend dev server
cd client && npm run dev
```

### Key Development Patterns

#### 1. Collaborative Data with Yjs

All collaborative state lives in Yjs documents. Use `Y.Map` for key-value data, `Y.Array` for ordered collections:

```typescript
// Bad: Local state that won't sync
const [markers, setMarkers] = useState([]);

// Good: Yjs-backed state
const yMarkers = ydoc.getArray<MarkerData>('markers');
const markers = useSyncedStore(yMarkers);
```

#### 2. Layer Architecture

Separate concerns between MapLibre (base map, vector tiles) and Deck.gl (dynamic data):

```typescript
// MapLibre: Static/semi-static vector tiles from Martin
<Map style={martinStyleUrl}>
  {/* Vector tile layers defined in style JSON */}
</Map>

// Deck.gl: Dynamic, frequently-updated operational data
<DeckGLOverlay layers={[
  new IconLayer({ data: unitPositions }),      // Updates every second
  new PathLayer({ data: plannedRoutes }),      // User-drawn, Yjs-synced
  new PolygonLayer({ data: operationalZones }) // Collaborative annotations
]} />
```

#### 3. Performance Considerations

- **Batch Yjs updates**: Wrap related changes in `ydoc.transact()`
- **Debounce awareness updates**: Cursor positions at 50ms intervals max
- **Use Deck.gl's `updateTriggers`**: Avoid full layer recreation
- **Tile caching**: Configure Martin + Nginx caching headers appropriately

### Code Style

- **TypeScript**: Strict mode enabled, no `any` without justification
- **React**: Functional components, hooks only
- **Formatting**: Prettier with project config
- **Linting**: ESLint with React + TypeScript rules
- **Commits**: Conventional commits (`feat:`, `fix:`, `chore:`, etc.)

---

## Database Schema (Core Tables)

```sql
-- Operational layers (e.g., "Blue Force", "Objectives", "Threats")
CREATE TABLE layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    layer_type TEXT NOT NULL,  -- 'units', 'annotations', 'zones'
    style JSONB,               -- Deck.gl/MapLibre style properties
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial features within layers
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_by UUID,           -- User reference
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_features_geometry ON features USING GIST(geometry);
CREATE INDEX idx_features_layer ON features(layer_id);

-- Yjs document persistence (used by Hocuspocus)
CREATE TABLE yjs_documents (
    name TEXT PRIMARY KEY,     -- Document identifier (e.g., 'room:operation-alpha')
    data BYTEA NOT NULL,       -- Yjs encoded state
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Martin Configuration

```yaml
# martin/config.yaml
listen_addresses: '0.0.0.0:3000'

postgres:
  connection_string: '${DATABASE_URL}'
  auto_publish:
    tables: true
    functions: true
  tables:
    features:
      geometry_column: geometry
      srid: 4326
      id_column: id
      minzoom: 0
      maxzoom: 22

sprites:
  paths:
    - /sprites

fonts:
  - /fonts
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://overwatch:secret@localhost:5432/overwatch

# Redis
REDIS_URL=redis://localhost:6379

# Hocuspocus
HOCUSPOCUS_PORT=1234
HOCUSPOCUS_SECRET=your-jwt-secret

# Martin
MARTIN_PORT=3000

# Client
VITE_MAP_STYLE_URL=http://localhost:3000/style.json
VITE_HOCUSPOCUS_URL=ws://localhost:1234
VITE_API_URL=http://localhost:8080
```

---

## Key Integration Points

### MapLibre + Deck.gl Integration

Use `@deck.gl/mapbox` layer for seamless integration:

```typescript
import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({ ... });
const deckOverlay = new MapboxOverlay({ layers: [] });
map.addControl(deckOverlay);

// Update layers reactively
deckOverlay.setProps({ layers: newLayers });
```

### Yjs + Hocuspocus Connection

```typescript
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const provider = new HocuspocusProvider({
  url: import.meta.env.VITE_HOCUSPOCUS_URL,
  name: `operation:${operationId}`,
  document: ydoc,
  token: authToken,
});

// Awareness for cursor presence
provider.awareness.setLocalState({
  user: { name: currentUser.name, color: currentUser.color },
  cursor: null, // Updated on mouse move
});
```

### Syncing Drawings to Map

```typescript
// Subscribe to Yjs changes, update Deck.gl layers
const yAnnotations = ydoc.getArray('annotations');

yAnnotations.observe(() => {
  const data = yAnnotations.toArray();
  setAnnotationLayer(new GeoJsonLayer({
    id: 'annotations',
    data: { type: 'FeatureCollection', features: data },
    // ... style props
  }));
});
```

---

## Testing Strategy

- **Unit**: Vitest for utility functions, Yjs operations
- **Component**: React Testing Library for UI components
- **Integration**: Playwright for E2E collaborative scenarios
- **Load**: k6 for WebSocket connection scaling

---

## Deployment Considerations

1. **Horizontal Scaling**: Hocuspocus instances sync via Redis pub/sub
2. **Tile Caching**: CDN or Nginx cache for Martin tiles (high cache TTL for base map)
3. **Document Sharding**: Partition Yjs documents by operation/room
4. **Offline Support**: Service Worker + IndexedDB for Yjs document caching

---

## Security Notes

- All WebSocket connections require JWT authentication
- Document-level access control in Hocuspocus `onAuthenticate` hook
- PostGIS row-level security for multi-tenant deployments
- Rate limiting on tile requests to prevent abuse

---

## References

- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [Deck.gl Docs](https://deck.gl/docs)
- [Yjs Docs](https://docs.yjs.dev/)
- [Hocuspocus Docs](https://tiptap.dev/docs/hocuspocus/introduction)
- [Martin Docs](https://martin.maplibre.org/)
- [PostGIS Reference](https://postgis.net/documentation/)
