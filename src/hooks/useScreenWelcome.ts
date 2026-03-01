import { useState, useEffect, useCallback } from 'react';
import { useScreenInfoStore, type WelcomeScreenId } from '@/store/screenInfoStore';
import { SCREEN_WELCOME_CONTENT } from '@/constants/screenWelcomeContent';

const AUTO_SHOW_DELAY_MS = 500;

export function useScreenWelcome(screenId: WelcomeScreenId) {
  const screensSeen = useScreenInfoStore((s) => s.screensSeen);
  const markScreenSeen = useScreenInfoStore((s) => s.markScreenSeen);

  const hasSeen = screensSeen[screenId];
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Auto-show on first visit after a short delay
  useEffect(() => {
    if (hasSeen) return;

    const timer = setTimeout(() => {
      setIsModalVisible(true);
    }, AUTO_SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasSeen]);

  const dismissModal = useCallback(() => {
    setIsModalVisible(false);
    if (!hasSeen) {
      markScreenSeen(screenId);
    }
  }, [hasSeen, markScreenSeen, screenId]);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  return {
    isModalVisible,
    dismissModal,
    showModal,
    isFirstVisit: !hasSeen,
    content: SCREEN_WELCOME_CONTENT[screenId],
  };
}
