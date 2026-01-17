
export interface Member {
  id: string;
  name: string;
  rssi: number; // Received Signal Strength Indication
  distance: number; // Estimated distance in meters
  lastSeen: number;
  status: 'connected' | 'warning' | 'lost';
  avatar: string;
  isIgnored?: boolean;
  battery: number; // Battery percentage 0-100
  isHighlighted?: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
}

export interface Breadcrumb {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface POI {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'camp' | 'water' | 'danger' | 'generic';
}

export interface AppState {
  view: 'mesh' | 'trail';
  isScanning: boolean;
  isRecordingTrail: boolean;
  isTestMode: boolean;
  safeDistance: number;
  calibrationOffset: number;
  members: Member[];
  userName: string;
  userLocation: UserLocation | null;
  breadcrumbs: Breadcrumb[];
  pois: POI[];
  highlightedMemberId: string | null;
}

export enum DistanceThreshold {
  WARNING = 15,
  CRITICAL = 25
}
