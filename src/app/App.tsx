import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { MotionConfig } from 'framer-motion';
import { useThemeEffect } from '@/hooks/useTheme';
import { createAppRouter } from './router';

export function App() {
  useThemeEffect();
  const [router] = useState(createAppRouter);

  return (
    // Honour the operating system's reduced-motion preference everywhere.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
