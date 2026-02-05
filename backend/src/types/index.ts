import { SessionMode, SessionStatus, SessionPhase, MemberStatus, SwipeDirection, MatchType, DecisionMethod } from '@prisma/client';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// User Types
// ============================================

export interface UserInfo {
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

// ============================================
// Session Types
// ============================================

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

export interface SessionInfo {
  id: string;
  code: string;
  mode: SessionMode;
  status: SessionStatus;
  phase: SessionPhase;
  owner: MemberInfo;
  members: MemberInfo[];
  filters: SessionFilters;
  inviteUrl?: string;
  expiresAt: Date;
  createdAt: Date;
  startedAt: Date | null;
}

// ============================================
// Card/Deck Types
// ============================================

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
  tags: string[];
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

// ============================================
// Swipe & Decision Types
// ============================================

export interface SwipeData {
  userId: string;
  itemId: string;
  direction: SwipeDirection;
  durationMs?: number;
}

export interface MatchResult {
  type: MatchType;
  winnerId: string | null;
  confidence: number;
  tiedItems?: string[];
  topItems?: Array<{ itemId: string; score: number }>;
  votes: Record<string, Record<string, SwipeDirection>>;
}

export interface DecisionInfo {
  id: string;
  method: DecisionMethod;
  confidence: number;
  timeToDecisionMs: number;
  menu?: MenuInfo;
  restaurant?: RestaurantInfo;
  votes: Record<string, { menu?: SwipeDirection; restaurant?: SwipeDirection }>;
}

// ============================================
// Socket Event Types
// ============================================

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

// Re-export Prisma enums for convenience
export { SessionMode, SessionStatus, SessionPhase, MemberStatus, SwipeDirection, MatchType, DecisionMethod };
