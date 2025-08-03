import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { 
  getEffectiveSettings, 
  saveResponseStyle, 
  saveBetaFeatures, 
  saveSecurityLevel,
  resetAllSettings 
} from '../../utils/user-settings.js';

interface SettingsMenuProps {
  onClose: () => void;
}

interface Settings {
  responseStyle: 'concise' | 'verbose' | 'balanced';
  enableBatching: boolean;
  enableCodeReferences: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  condenseThreshold: number;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const menuItems = [
    { key: 'responseStyle', label: 'Response Style', type: 'select' as const },
    { key: 'enableBatching', label: 'Multi-Tool Batching (BETA)', type: 'toggle' as const },
    { key: 'enableCodeReferences', label: 'Code References (BETA)', type: 'toggle' as const },
    { key: 'securityLevel', label: 'Security Level', type: 'select' as const },
    { key: 'reset', label: 'Reset to Defaults', type: 'action' as const },
    { key: 'close', label: 'Close Settings', type: 'action' as const },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getEffectiveSettings();
      setSettings(currentSettings);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setIsLoading(false);
    }
  };

  const saveCurrentSettings = async (newSettings: Settings) => {
    try {
      await Promise.all([
        saveResponseStyle(newSettings.responseStyle),
        saveBetaFeatures(newSettings.enableBatching, newSettings.enableCodeReferences),
        saveSecurityLevel(newSettings.securityLevel),
      ]);
      
      setSaveStatus('✅ Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      setSaveStatus('❌ Failed to save settings');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleReset = async () => {
    try {
      await resetAllSettings();
      await loadSettings();
      setSaveStatus('✅ Settings reset to defaults!');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      setSaveStatus('❌ Failed to reset settings');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  useInput((input, key) => {
    if (!settings) return;

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(menuItems.length - 1, selectedIndex + 1));
    } else if (key.return) {
      const selectedItem = menuItems[selectedIndex];
      
      if (selectedItem.key === 'close') {
        onClose();
      } else if (selectedItem.key === 'reset') {
        handleReset();
      } else if (selectedItem.type === 'toggle') {
        const newSettings = { ...settings };
        if (selectedItem.key === 'enableBatching') {
          newSettings.enableBatching = !newSettings.enableBatching;
        } else if (selectedItem.key === 'enableCodeReferences') {
          newSettings.enableCodeReferences = !newSettings.enableCodeReferences;
        }
        setSettings(newSettings);
        saveCurrentSettings(newSettings);
      } else if (selectedItem.type === 'select') {
        if (selectedItem.key === 'responseStyle') {
          const styles: ('concise' | 'verbose' | 'balanced')[] = ['concise', 'verbose', 'balanced'];
          const currentIndex = styles.indexOf(settings.responseStyle);
          const nextIndex = (currentIndex + 1) % styles.length;
          const newSettings = { ...settings, responseStyle: styles[nextIndex] };
          setSettings(newSettings);
          saveCurrentSettings(newSettings);
        } else if (selectedItem.key === 'securityLevel') {
          const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
          const currentIndex = levels.indexOf(settings.securityLevel);
          const nextIndex = (currentIndex + 1) % levels.length;
          const newSettings = { ...settings, securityLevel: levels[nextIndex] };
          setSettings(newSettings);
          saveCurrentSettings(newSettings);
        }
      }
    } else if (key.escape) {
      onClose();
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="blue">⚙️  Loading settings...</Text>
      </Box>
    );
  }

  if (!settings) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Failed to load settings</Text>
        <Text color="gray">Press ESC to close</Text>
      </Box>
    );
  }

  const getValueDisplay = (item: typeof menuItems[0]) => {
    switch (item.key) {
      case 'responseStyle':
        return `[${settings.responseStyle}]`;
      case 'enableBatching':
        return settings.enableBatching ? '[ON]' : '[OFF]';
      case 'enableCodeReferences':
        return settings.enableCodeReferences ? '[ON]' : '[OFF]';
      case 'securityLevel':
        return `[${settings.securityLevel}]`;
      default:
        return '';
    }
  };

  const getItemColor = (index: number, item: typeof menuItems[0]) => {
    if (index === selectedIndex) {
      return 'cyan';
    }
    
    if (item.type === 'toggle') {
      const isEnabled = item.key === 'enableBatching' ? settings.enableBatching : settings.enableCodeReferences;
      return isEnabled ? 'green' : 'gray';
    }
    
    return 'white';
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text color="blue" bold>⚙️  JURIKO Settings</Text>
      <Newline />
      
      {menuItems.map((item, index) => (
        <Box key={item.key} marginBottom={0}>
          <Text color={getItemColor(index, item)}>
            {index === selectedIndex ? '▶ ' : '  '}
            {item.label}
            {item.type !== 'action' && (
              <Text color="yellow"> {getValueDisplay(item)}</Text>
            )}
          </Text>
        </Box>
      ))}
      
      <Newline />
      
      {saveStatus && (
        <>
          <Text color={saveStatus.includes('✅') ? 'green' : 'red'}>
            {saveStatus}
          </Text>
          <Newline />
        </>
      )}
      
      <Box flexDirection="column">
        <Text color="gray">Navigation:</Text>
        <Text color="gray">  ↑/↓ - Navigate  ENTER - Toggle/Change  ESC - Close</Text>
        <Newline />
        <Text color="yellow">Beta Features:</Text>
        <Text color="gray">  • Multi-Tool Batching: Execute multiple tools in parallel</Text>
        <Text color="gray">  • Code References: Clickable file links in VSCode</Text>
        <Newline />
        <Text color="cyan">Settings saved to: ~/.juriko/user-settings.json</Text>
      </Box>
    </Box>
  );
};