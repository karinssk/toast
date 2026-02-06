import liff from '@line/liff';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2008883284-yeuZoWhO';

let isInitialized = false;

export async function initializeLiff(): Promise<void> {
  if (isInitialized) return;

  try {
    await liff.init({ liffId: LIFF_ID });
    isInitialized = true;
    console.log('LIFF initialized successfully');
  } catch (error) {
    console.error('LIFF initialization failed:', error);
    throw error;
  }
}

export function isLiffReady(): boolean {
  return isInitialized;
}

export function isLoggedIn(): boolean {
  if (!isInitialized) return false;
  return liff.isLoggedIn();
}

export function login(): void {
  if (!isInitialized) {
    console.error('LIFF not initialized');
    return;
  }
  liff.login();
}

export function logout(): void {
  if (!isInitialized) return;
  liff.logout();
}

export async function getIdToken(): Promise<string | null> {
  if (!isInitialized) return null;
  try {
    return liff.getIDToken();
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
} | null> {
  if (!isInitialized || !liff.isLoggedIn()) return null;
  try {
    return await liff.getProfile();
  } catch {
    return null;
  }
}

export function getLiffId(): string {
  return LIFF_ID;
}

export function isInClient(): boolean {
  if (!isInitialized) return false;
  return liff.isInClient();
}

export function getOS(): 'ios' | 'android' | 'web' {
  if (!isInitialized) return 'web';
  return liff.getOS() as 'ios' | 'android' | 'web';
}

export async function shareTargetPicker(
  messages: Array<{
    type: 'text';
    text: string;
  }>
): Promise<void> {
  if (!isInitialized) return;
  try {
    await liff.shareTargetPicker(messages);
  } catch (error) {
    console.error('Share failed:', error);
  }
}

export function openWindow(url: string, external = false): void {
  if (!isInitialized) {
    window.open(url, '_blank');
    return;
  }
  liff.openWindow({ url, external });
}

export function closeWindow(): void {
  if (!isInitialized) return;
  liff.closeWindow();
}

// Get URL parameters (useful for invite codes)
export function getUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function getSessionCodeFromUrl(): string | null {
  const params = getUrlParams();
  return params.get('session') || params.get('code');
}
