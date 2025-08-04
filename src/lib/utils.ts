
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function getEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
}

export function getNameInitials(name:string):string{
if(!name || typeof name !== 'string') return "";
  const newname = name?.trimStart().trimEnd();
  if (!newname) return "";
  return newname.charAt(0).toUpperCase() + (newname.split(" ")[1][0].toUpperCase() ) || newname.charAt(0).toUpperCase();

}
// utils.tsx
export interface UserObject {
  sessionVersion: number;
  passwordChangedAt: Date | null;
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  avatar: string | null;
  lastLogin: Date | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Helper function to check if we're in the browser
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// Function to remove user data cookie
export function removeUserCookie(): void {
  if (!isBrowser()) {
    console.warn('removeUserCookie called on server side');
    return;
  }
  
  try {
    document.cookie = '_vrf_tkn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  } catch (error) {
    console.error('Error loggin out', error);
  }
}

// Function to check if _vrf_tkn cookie exists and return boolean
export function verificationTokenExists(): boolean {
  if (!isBrowser()) {
    return false;
  }
  
  try {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => {
      const trimmedCookie = cookie.trim();
      return trimmedCookie.startsWith('_vrf_tkn=') && trimmedCookie.length > '_vrf_tkn='.length;
    });
  } catch (error) {
    console.error('Error checking verification token:', error);
    return false;
  }
}

// Optional: Simple obfuscation (NOT true security, just makes it less readable)
function obfuscateData(data: string): string {
  return btoa(data); // Base64 encoding
}

function deobfuscateData(data: string): string {
  return atob(data); // Base64 decoding
}

// Enhanced version with basic obfuscation
export function storeUserInCookieObfuscated(user: UserObject, options?: {
  expires?: number;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): void {
  if (!isBrowser()) {
    console.warn('storeUserInCookieObfuscated called on server side');
    return;
  }

  const {
    expires = 7,
    secure = true,
    sameSite = 'strict'
  } = options || {};

  try {
    const userJson = JSON.stringify(user);
    const obfuscated = obfuscateData(userJson);
    const encodedUser = encodeURIComponent(obfuscated);
    
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (expires * 24 * 60 * 60 * 1000));
    
    let cookieString = `_vrf_tkn=${encodedUser}; expires=${expirationDate.toUTCString()}; path=/`;
    
    if (secure) cookieString += '; secure';
    cookieString += `; samesite=${sameSite}`;
    
    document.cookie = cookieString;
  
  } catch (error) {
    console.error('Error storing obfuscated user data:', error);
    throw new Error('Failed to store user data in cookie');
  }
}

export function getUserFromCookieObfuscated(): UserObject | null {
  if (!isBrowser()) {
    return null;
  }
  
  try {
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => 
      cookie.trim().startsWith('_vrf_tkn=')
    );
    
    if (!userCookie) return null;
    
    const cookieValue = userCookie.split('=')[1];
    const decodedValue = decodeURIComponent(cookieValue);
    const deobfuscated = deobfuscateData(decodedValue);
    const userData = JSON.parse(deobfuscated);
    
    if (userData.passwordChangedAt) {
      userData.passwordChangedAt = new Date(userData.passwordChangedAt);
    }
    if (userData.lastLogin) {
      userData.lastLogin = new Date(userData.lastLogin);
    }
    
    return userData as UserObject;
  } catch (error) {
    console.error('Error retrieving obfuscated user data:', error);
    return null;
  }
}

// Hook for React components to safely use cookies
export function useUserCookie() {
  if (!isBrowser()) {
    return {
      user: null,
      hasToken: false,
      storeUser: () => {},
      removeUser: () => {},
    };
  }

  const user = getUserFromCookieObfuscated();
  const hasToken = verificationTokenExists();

  return {
    user,
    hasToken,
    storeUser: storeUserInCookieObfuscated,
    removeUser: removeUserCookie,
  };
}

// Alternative: Use useEffect in React components
/*
Example usage in a React component:

import { useEffect, useState } from 'react';
import { getUserFromCookieObfuscated, verificationTokenExists } from './utils';

function MyComponent() {
  const [user, setUser] = useState<UserObject | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // This runs only on the client side
    const userData = getUserFromCookieObfuscated();
    const hasToken = verificationTokenExists();
    
    setUser(userData);
    setIsLoggedIn(hasToken);
  }, []);

  return (
    <div>
      {isLoggedIn ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
*/

// Example usage with the hook:
/*
function MyComponent() {
  const { user, hasToken, storeUser, removeUser } = useUserCookie();

  if (hasToken && user) {
    return <p>Welcome, {user.name}!</p>;
  }

  return <p>Please log in</p>;
}
*/

export const getLocationFromIp = async (ip: string): Promise<string> => {
  if (!ip || ip === 'Unknown') return 'Unknown';

  try {
    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.json();

    if (data.success) {
      const { city, region, country } = data;
      return [city, region, country].filter(Boolean).join(', ');
    }
  } catch (err) {
    console.warn('IP location fetch failed:', err);
  }

  return ip; // fallback to raw IP if lookup fails
};

export const getClientIp = (forwardedFor: string | null): string => {
  const rawIp = forwardedFor?.split(',')[0].trim();

  if (process.env.NODE_ENV === 'development') {
    return '8.8.8.8'; // Use mock IP like Google DNS for dev testing
  }

  // Handle loopback and fallback
  if (!rawIp || rawIp === '::1' || rawIp === '127.0.0.1') {
    return 'Unknown';
  }

  return rawIp;
};

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//  ===================================== //





export function formatTimestamp(timestamp: Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Powered Off':
      return 'text-gray-400';
    case 'Standby':
      return 'text-yellow-400';
    case 'Pre-Flight':
      return 'text-blue-400';
    case 'Active':
      return 'text-green-400';
    case 'In Flight':
      return 'text-cyan-400';
    case 'Landing':
      return 'text-orange-400';
    case 'Delivered':
      return 'text-green-500';
    case 'Returning':
      return 'text-purple-400';
    case 'Maintenance':
      return 'text-orange-500';
    case 'Emergency':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'Powered Off':
      return '⚫';
    case 'Standby':
      return '🟡';
    case 'Pre-Flight':
      return '🔵';
    case 'Active':
      return '🟢';
    case 'In Flight':
      return '🚁';
    case 'Landing':
      return '🛬';
    case 'Delivered':
      return '📦';
    case 'Returning':
      return '🔄';
    case 'Maintenance':
      return '🔧';
    case 'Emergency':
      return '🚨';
    default:
      return '❓';
  }
}

export function getGaugeColor(value: number, type: 'battery' | 'temperature' | 'humidity' | 'speed' | 'altitude'): string {
  switch (type) {
    case 'battery':
      if (value > 50) return '#22c55e'; // green
      if (value > 20) return '#eab308'; // yellow
      return '#ef4444'; // red
    case 'temperature':
      if (value < 0 || value > 50) return '#ef4444'; // red
      if (value > 35) return '#eab308'; // yellow
      return '#22c55e'; // green
    case 'humidity':
      if (value > 80) return '#ef4444'; // red
      if (value > 60) return '#eab308'; // yellow
      return '#22c55e'; // green
    case 'speed':
      if (value > 60) return '#ef4444'; // red
      if (value > 40) return '#eab308'; // yellow
      return '#22c55e'; // green
    case 'altitude':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
}

export function getTimeRangeInMs(range: string): number {
  switch (range) {
    case '10m':
      return 10 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}