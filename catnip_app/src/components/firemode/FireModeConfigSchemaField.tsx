import { useCallback, useEffect } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  INVALID_FIELD_BACKGROUND_COLOR,
  INVALID_FIELD_BORDER_COLOR,
} from '@/components/form/invalid-field-styles';
import { useTheme } from '@/hooks/use-theme';
import {
  formatConfigUnit,
  isNumericWireValueValid,
} from '@/lib/firemode-config-utils';
import type { FireModeConfigSchemaEntry, FireModeConfigSchemaNumeric } from '@/messages/types';

type FireModeConfigSchemaFieldProps = {
  fieldKey?: string;
  entry: FireModeConfigSchemaEntry;
  value: string;
  onValueChange: (next: string) => void;
  readOnly?: boolean;
  /** Increment to shake this field when invalid (e.g. blocked save tap). */
  shakeTrigger?: number;
};

type NumericFieldProps = {
  entry: FireModeConfigSchemaNumeric;
  value: string;
  onValueChange: (next: string) => void;
  readOnly: boolean;
  shakeTrigger: number;
};

function NumericFireModeConfigSchemaField({
  entry,
  value,
  onValueChange,
  readOnly,
  shakeTrigger,
}: NumericFieldProps) {
  const { theme } = useTheme();
  const shakeX = useSharedValue(0);

  const unit = formatConfigUnit(entry.unit);
  const rangeText = `${entry.min}–${entry.max}`;
  const invalid = !isNumericWireValueValid(value, entry.min, entry.max);
  const inputPaddingRight = unit ? 44 : 14;

  useEffect(() => {
    if (!invalid || shakeTrigger === 0) {
      return;
    }
    shakeX.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
  }, [invalid, shakeTrigger, shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.foreground }]}>
          {entry.display_name}
        </Text>
        <Text
          style={[
            styles.range,
            { color: invalid ? INVALID_FIELD_BORDER_COLOR : theme.colors.muted },
          ]}
        >
          {rangeText}
        </Text>
      </View>
      <Animated.View
        style={[
          shakeStyle,
          styles.inputWrap,
          {
            borderColor: invalid ? INVALID_FIELD_BORDER_COLOR : theme.colors.border,
            borderWidth: invalid ? 2 : StyleSheet.hairlineWidth,
            backgroundColor: invalid
              ? INVALID_FIELD_BACKGROUND_COLOR
              : theme.colors.background,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onValueChange}
          keyboardType="number-pad"
          editable={!readOnly}
          accessibilityLabel={`${entry.display_name}, ${rangeText}`}
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              paddingRight: inputPaddingRight,
            },
          ]}
        />
        {unit ? (
          <Text style={[styles.unitSuffix, { color: theme.colors.muted }]} pointerEvents="none">
            {unit}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function FireModeConfigSchemaField({
  entry,
  value,
  onValueChange,
  readOnly = false,
  shakeTrigger = 0,
}: FireModeConfigSchemaFieldProps) {
  const { theme } = useTheme();

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

  return (
    <NumericFireModeConfigSchemaField
      entry={entry}
      value={value}
      onValueChange={onValueChange}
      readOnly={readOnly}
      shakeTrigger={shakeTrigger}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  range: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrap: {
    borderRadius: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  unitSuffix: {
    position: 'absolute',
    right: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  booleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
