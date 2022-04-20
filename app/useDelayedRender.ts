// copied from github.com/pacocoursey/use-delayed-render because it feel behind using React 16 instead of 17, causing peer dep issues
import * as React from "react";

interface Options {
  enterDelay?: number;
  exitDelay?: number;
  onUnmount?: () => void;
}

export function useDelayedRender(
  active: boolean = false,
  options: Options = {}
) {
  const [, force] = React.useState<any>();
  const mounted = React.useRef(active);
  const rendered = React.useRef(false);
  const renderTimer = React.useRef<NodeJS.Timeout | null>(null);
  const unmountTimer = React.useRef<NodeJS.Timeout | null>(null);
  const prevActive = React.useRef(active);

  const recalculate = React.useCallback(() => {
    const { enterDelay = 1, exitDelay = 0 } = options;

    if (prevActive.current) {
      // Mount immediately
      mounted.current = true;
      if (unmountTimer.current) clearTimeout(unmountTimer.current);

      if (enterDelay <= 0) {
        // Render immediately
        rendered.current = true;
      } else {
        if (renderTimer.current) return;

        // Render after a delay
        renderTimer.current = setTimeout(() => {
          rendered.current = true;
          renderTimer.current = null;
          force({});
        }, enterDelay);
      }
    } else {
      // Immediately set to unrendered
      rendered.current = false;

      if (exitDelay <= 0) {
        mounted.current = false;
      } else {
        if (unmountTimer.current) return;

        // Unmount after a delay
        unmountTimer.current = setTimeout(() => {
          mounted.current = false;
          unmountTimer.current = null;
          force({});
        }, exitDelay);
      }
    }
  }, [options]);

  // When the active prop changes, need to re-calculate
  if (active !== prevActive.current) {
    prevActive.current = active;
    // We want to do this synchronously with the render, not in an effect
    // this way when active → true, mounted → true in the same pass
    recalculate();
  }

  return {
    mounted: mounted.current,
    rendered: rendered.current,
  };
}
