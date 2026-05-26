import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { flattenSchemaFields } from '@/lib/firemode-config-utils';
import type { FireModeConfigFields } from '@/messages/types';

import { FireModeConfigSchemaField } from './FireModeConfigSchemaField';

type FireModeConfigSchemaFormProps = {
  schema: FireModeConfigFields;
  values: Record<string, string>;
  onValuesChange: (next: Record<string, string>) => void;
  readOnly?: boolean;
};

export function FireModeConfigSchemaForm({
  schema,
  values,
  onValuesChange,
  readOnly = false,
}: FireModeConfigSchemaFormProps) {
  const { theme } = useTheme();
  const fields = flattenSchemaFields(schema);

  if (fields.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.colors.muted }]}>
        No configurable fields.
      </Text>
    );
  }

  return (
    <View>
      {fields.map(({ key, entry }) => (
        <FireModeConfigSchemaField
          key={key}
          entry={entry}
          value={values[key] ?? ''}
          readOnly={readOnly}
          onValueChange={(next) => {
            onValuesChange({ ...values, [key]: next });
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
