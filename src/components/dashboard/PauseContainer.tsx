"use client"

import React, { useEffect, useState } from 'react';
import { SmartPauseButton } from './SmartPauseButton';
import { getRestaurantPauseStatusAction } from '@/app/dashboard/actions';

export function PauseContainer() {
  const [data, setData] = useState<{ isPaused: boolean, pausedUntil: string | null } | null>(null);

  useEffect(() => {
    getRestaurantPauseStatusAction().then(res => {
      if (res.success) {
        setData({ isPaused: !!res.isPaused, pausedUntil: res.pausedUntil || null });
      } else {
        setData({ isPaused: false, pausedUntil: null });
      }
    }).catch(e => {
      console.error(e);
      setData({ isPaused: false, pausedUntil: null });
    });
  }, []);

  if (!data) return null; // or empty div while loading

  return (
    <SmartPauseButton 
      initialIsPaused={data.isPaused} 
      initialPausedUntil={data.pausedUntil ? new Date(data.pausedUntil) : null} 
    />
  );
}
