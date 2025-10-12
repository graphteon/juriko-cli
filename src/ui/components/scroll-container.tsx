import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Text } from 'ink';

interface ScrollContainerProps {
  children: React.ReactNode;
  autoScroll?: boolean;
  maxHeight?: number;
}

export const ScrollContainer: React.FC<ScrollContainerProps> = ({
  children,
  autoScroll = true,
  maxHeight = 25
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentRef = useRef<any>(null);
  const lastChildCountRef = useRef(0);
  const isStreamingRef = useRef(false);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    const childCount = React.Children.count(children);
    
    // Check if we're streaming (new content being added)
    if (childCount > lastChildCountRef.current) {
      isStreamingRef.current = true;
      
      if (autoScroll && isAtBottom) {
        // Keep scrolled to bottom during streaming
        const newScrollPosition = Math.max(0, childCount - maxHeight);
        setScrollPosition(newScrollPosition);
        setIsAtBottom(newScrollPosition + maxHeight >= childCount);
      }
      
      lastChildCountRef.current = childCount;
      
      // Reset streaming flag after a short delay
      setTimeout(() => {
        isStreamingRef.current = false;
      }, 100);
    }
  }, [children, autoScroll, isAtBottom, maxHeight]);

  // Calculate visible content based on scroll position
  const visibleChildren = React.useMemo(() => {
    const childArray = React.Children.toArray(children);
    const totalChildren = childArray.length;
    
    if (totalChildren <= maxHeight) {
      return childArray;
    }
    
    const startIndex = Math.max(0, Math.min(scrollPosition, totalChildren - maxHeight));
    const endIndex = Math.min(totalChildren, startIndex + maxHeight);
    
    return childArray.slice(startIndex, endIndex);
  }, [children, scrollPosition, maxHeight]);

  // Show scroll indicators
  const totalChildren = React.Children.count(children);
  const actualScrollPosition = totalChildren <= maxHeight ? 0 : Math.max(0, Math.min(scrollPosition, totalChildren - maxHeight));
  const canScrollUp = actualScrollPosition > 0;
  const canScrollDown = actualScrollPosition + maxHeight < totalChildren;

  return (
    <Box flexDirection="column" width="100%">
      {/* Scroll up indicator - more subtle like Claude */}
      {canScrollUp && (
        <Box justifyContent="center" marginBottom={1}>
          <Box paddingX={1}>
            <Text color="gray" dimColor>
              ↑ {actualScrollPosition} messages above
            </Text>
          </Box>
        </Box>
      )}

      {/* Content area with smooth transitions */}
      <Box flexDirection="column" ref={contentRef}>
        {visibleChildren}
      </Box>

      {/* Scroll down indicator - more subtle like Claude */}
      {canScrollDown && (
        <Box justifyContent="center" marginTop={1}>
          <Box paddingX={1}>
            <Text color="gray" dimColor>
              ↓ {totalChildren - (actualScrollPosition + maxHeight)} more messages below
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};