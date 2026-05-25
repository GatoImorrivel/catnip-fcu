import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownProps<T extends string> = {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  style,
}: DropdownProps<T>) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  const handleSelect = useCallback(
    (next: T) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <View style={[styles.root, open && styles.rootOpen, style]}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <Pressable
        onPress={toggleOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}, ${selectedLabel}`}
        style={({ pressed }) => [
          styles.trigger,
          open && styles.triggerOpen,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.triggerText, { color: theme.colors.foreground }]}>
          {selectedLabel}
        </Text>
        <MaterialIcons
          name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={24}
          color={theme.colors.muted}
        />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.list,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          {options.map((item) => {
            const selected = item.value === value;

            return (
              <Pressable
                key={item.value}
                onPress={() => handleSelect(item.value)}
                style={({ pressed }) => [
                  styles.option,
                  selected && { backgroundColor: theme.colors.primary },
                  pressed && !selected && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={{
                    color: selected
                      ? theme.colors.primaryForeground
                      : theme.colors.foreground,
                    fontWeight: selected ? '600' : '400',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 20,
  },
  rootOpen: {
    zIndex: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerText: {
    fontSize: 16,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
