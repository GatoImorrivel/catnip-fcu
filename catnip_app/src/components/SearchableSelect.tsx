import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export type SearchableSelectOption<T extends string> = {
  value: T;
  label: string;
  /** Extra text included when filtering search results. */
  searchText?: string;
};

export type SearchableSelectFooterItem = {
  key: string;
  onPress: () => void;
  render: () => ReactNode;
};

type SearchableSelectProps<T extends string> = {
  label?: string;
  value: T | null;
  options: SearchableSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
  modalTitle?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  style?: StyleProp<ViewStyle>;
  renderValue?: (option: SearchableSelectOption<T> | null) => ReactNode;
  renderOption?: (option: SearchableSelectOption<T>, selected: boolean) => ReactNode;
  footerItems?: SearchableSelectFooterItem[];
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function optionMatchesQuery<T extends string>(
  option: SearchableSelectOption<T>,
  query: string,
): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${option.label} ${option.searchText ?? ''}`.toLowerCase();
  return haystack.includes(query);
}

export function SearchableSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select…',
  modalTitle,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  style,
  renderValue,
  renderOption,
  footerItems = [],
}: SearchableSelectProps<T>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value) ?? null;
  const normalizedQuery = normalizeQuery(query);

  const filteredOptions = useMemo(
    () => options.filter((option) => optionMatchesQuery(option, normalizedQuery)),
    [normalizedQuery, options],
  );

  const openModal = useCallback(() => {
    if (disabled || options.length === 0) {
      return;
    }
    setQuery('');
    setOpen(true);
  }, [disabled, options.length]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const handleSelect = useCallback(
    (next: T) => {
      onChange(next);
      closeModal();
    },
    [closeModal, onChange],
  );

  const title = modalTitle ?? label ?? 'Select';

  return (
    <View style={[styles.root, style]}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>{label}</Text>
      ) : null}

      <Pressable
        onPress={openModal}
        disabled={disabled || options.length === 0}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityLabel={
          selected ? `${label ?? 'Selection'}, ${selected.label}` : label ?? placeholder
        }
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.triggerContent}>
          {renderValue ? (
            renderValue(selected)
          ) : (
            <Text
              style={[
                styles.triggerText,
                { color: selected ? theme.colors.foreground : theme.colors.muted },
              ]}
              numberOfLines={1}
            >
              {selected?.label ?? placeholder}
            </Text>
          )}
        </View>
        <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <Pressable style={styles.dismissArea} onPress={closeModal} accessibilityLabel="Close" />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>{title}</Text>
              <Pressable
                onPress={closeModal}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchRow,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            >
              <MaterialIcons name="search" size={22} color={theme.colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.searchInput, { color: theme.colors.foreground }]}
              />
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={
                filteredOptions.length === 0 ? styles.listEmptyContent : undefined
              }
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                  {emptyMessage}
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;

                return (
                  <Pressable
                    onPress={() => handleSelect(item.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && { backgroundColor: theme.colors.primary },
                      pressed && !isSelected && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.optionBody}>
                      {renderOption ? (
                        renderOption(item, isSelected)
                      ) : (
                        <Text
                          style={{
                            color: isSelected
                              ? theme.colors.primaryForeground
                              : theme.colors.foreground,
                            fontWeight: isSelected ? '600' : '400',
                            fontSize: 16,
                          }}
                        >
                          {item.label}
                        </Text>
                      )}
                    </View>
                    {isSelected ? (
                      <MaterialIcons
                        name="check"
                        size={22}
                        color={theme.colors.primaryForeground}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />

            {footerItems.length > 0 ? (
              <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                {footerItems.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      item.onPress();
                      closeModal();
                    }}
                    style={({ pressed }) => [styles.footerItem, pressed && { opacity: 0.85 }]}
                  >
                    {item.render()}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minWidth: 0,
  },
  fieldLabel: {
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  triggerContent: {
    flex: 1,
    minWidth: 0,
  },
  triggerText: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  list: {
    flexGrow: 0,
    maxHeight: 360,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 8,
  },
  footerItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
