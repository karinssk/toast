// User types
export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  onboardingStep: number;
  onboardingDone: boolean;
  preferences: UserPreferences | null;
}

export interface UserPreferences {
  cuisines: string[];
  priceRange: [number, number];
  maxDistance: number;
}

// Session types
export type SessionMode = 'SOLO' | 'GROUP';
export type SessionStatus = 'WAITING' | 'ACTIVE' | 'DECIDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
export type SessionPhase = 'MENU_SWIPE' | 'MENU_RESULT' | 'RESTAURANT_SWIPE' | 'FINAL_RESULT';
export type MemberStatus = 'ACTIVE' | 'IDLE' | 'REMOVED' | 'LEFT';
export type SwipeDirection = 'LEFT' | 'RIGHT' | 'UP';

export interface SessionFilters {
  cuisines: string[];
  priceRange: [number, number];
  maxDistance: number;
  location: { lat: number; lng: number } | null;
}

export interface MemberInfo {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  status: MemberStatus;
  progress: number;
  isOwner: boolean;
}

export interface Session {
  id: string;
  code: string;
  mode: SessionMode;
  status: SessionStatus;
  phase: SessionPhase;
  owner: MemberInfo;
  members: MemberInfo[];
  filters: SessionFilters;
  inviteUrl?: string;
  expiresAt: string;
  createdAt: string;
  startedAt: string | null;
}

// Card types
export interface CardInfo {
  id: string;
  type: 'menu' | 'restaurant';
  name: string;
  nameLocal?: string;
  imageUrl: string;
  description?: string;

  // Menu-specific
  cuisineType?: string;
  priceRange?: [number, number];
  tags?: string[];

  // Restaurant-specific
  distance?: number;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  address?: string;
}

export interface MenuInfo {
  id: string;
  name: string;
  nameLocal?: string;
  imageUrl: string;
  cuisineType: string;
  priceRange: [number, number];
  tags?: string[];
}

export interface RestaurantInfo {
  id: string;
  name: string;
  nameLocal?: string;
  imageUrl: string;
  description?: string;
  distance: number;
  rating?: number;
  priceLevel: number;
  isOpen: boolean;
  address: string;
  googleMapsUrl?: string;
  phone?: string;
}

// Decision types
export type MatchType = 'STRONG' | 'WEAK' | 'TIE' | 'SUPER';
export type DecisionMethod = 'UNANIMOUS' | 'MAJORITY' | 'SUPER_LIKE' | 'TIEBREAKER' | 'TIMEOUT';

export interface Decision {
  menu: MenuInfo | null;
  restaurant: RestaurantInfo | null;
  method: DecisionMethod;
  confidence: number;
  timeToDecisionMs: number;
  votes: Record<string, { menu?: SwipeDirection; restaurant?: SwipeDirection }>;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Socket event types
export interface RoomStatePayload {
  sessionId: string;
  code: string;
  status: SessionStatus;
  phase: SessionPhase;
  mode: SessionMode;
  owner: MemberInfo;
  members: MemberInfo[];
  filters: SessionFilters;
  deck?: CardInfo[];
  progress?: ProgressInfo;
  matchedMenu?: MenuInfo;
}

export interface ProgressInfo {
  totalCards: number;
  memberProgress: Record<string, number>;
  estimatedTimeRemaining: number;
}

export interface MatchFoundPayload {
  sessionId: string;
  phase: SessionPhase;
  itemId: string;
  matchType: MatchType;
  confidence: number;
  votes: Record<string, SwipeDirection>;
}

export interface PhaseResultPayload {
  sessionId: string;
  menu: MenuInfo | null;
  restaurant: RestaurantInfo | null;
  decision?: {
    method: string;
    confidence: number;
    timeToDecisionMs: number;
  };
}

// Admin types
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export interface Admin {
  id: string;
  username: string;
  email?: string | null;
  displayName: string;
  role: AdminRole;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}
