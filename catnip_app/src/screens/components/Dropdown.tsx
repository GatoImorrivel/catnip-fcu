import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { SearchableSelect, type SearchableSelectOption } from '@/components/SearchableSelect';

export type DropdownOption<T extends string> = SearchableSelectOption<T>;

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
  return (
    <SearchableSelect
      label={label}
      modalTitle={label}
      value={value}
      options={options}
      onChange={onChange}
      style={[styles.dropdown, style]}
      searchPlaceholder={`Search ${label.toLowerCase()}…`}
      emptyMessage="No matches"
    />
  );
}

const styles = StyleSheet.create({
  dropdown: {
    marginBottom: 20,
  },
});
