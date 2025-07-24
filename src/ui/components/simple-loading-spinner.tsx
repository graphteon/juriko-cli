import React, { useState, useEffect } from "react";
import { Text } from "ink";

export default function SimpleLoadingSpinner() {
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const interval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  return (
    <Text color="cyan">
      {spinnerFrames[spinnerFrame]}
    </Text>
  );
}