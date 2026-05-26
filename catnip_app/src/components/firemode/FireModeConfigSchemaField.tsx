import { useCallback } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import {
  clampNumericWireValue,
  formatConfigUnit,
} from '@/lib/firemode-config-utils';
import type { FireModeConfigSchemaEntry } from '@/messages/types';

type FireModeConfigSchemaFieldProps = {
  fieldKey?: string;
  entry: FireModeConfigSchemaEntry;
  value: string;
  onValueChange: (next: string) => void;
  readOnly?: boolean;
};

export function FireModeConfigSchemaField({
  entry,
  value,
  onValueChange,
  readOnly = false,
}: FireModeConfigSchemaFieldProps) {
  const { theme } = useTheme();

  const handleNumericBlur = useCallback(() => {
    if (entry.tag !== 'Numeric') {
      return;
    }
    onValueChange(clampNumericWireValue(value, entry.min, entry.max));
  }, [entry, onValueChange, value]);

  const handleBooleanToggle = useCallback(
    (checked: boolean) => {
      onValueChange(checked ? 'true' : 'false');
    },
    [onValueChange],
  );

  if (entry.tag === 'Boolean') {
    return (
      <View style={styles.booleanRow}>
        <Text style={[styles.label, { color: theme.colors.foreground }]}>
          {entry.display_name}
        </Text>
        <Switch
          value={value === 'true'}
          onValueChange={handleBooleanToggle}
          disabled={readOnly}
          accessibilityLabel={entry.display_name}
        />
      </View>
    );
  }

  const unit = formatConfigUnit(entry.unit);
  const unitSuffix = unit ? ` ${unit}` : '';
  const helperText = `${entry.min}–${entry.max}${unitSuffix}`;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{entry.display_name}</Text>
      <TextInput
        value={value}
        onChangeText={onValueChange}
        onBlur={handleNumericBlur}
        keyboardType="number-pad"
        editable={!readOnly}
        accessibilityLabel={`${entry.display_name}, ${helperText}`}
        style={[
          styles.input,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      />
      <Text style={[styles.helper, { color: theme.colors.muted }]}>{helperText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  helper: {
    fontSize: 13,
    marginTop: 4,
  },
  booleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
