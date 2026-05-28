import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { ProfileLabel } from '@/components/fcu-profiles/ProfileLabel';
import { SearchableSelect } from '@/components/SearchableSelect';
import {
  getProfileDisplayName,
  NEW_PROFILE_OPTION_VALUE,
  type FcuProfile,
  type FcuProfileId,
} from '@/fcu-profiles';
import { useTheme } from '@/hooks/use-theme';

type ProfileDropdownProps = {
  profiles: FcuProfile[];
  value: FcuProfileId | null;
  onSelectProfile: (profileId: FcuProfileId) => void;
  onRequestNewProfile: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProfileDropdown({
  profiles,
  value,
  onSelectProfile,
  onRequestNewProfile,
  disabled = false,
  style,
}: ProfileDropdownProps) {
  const { theme } = useTheme();

  const selected = value ? (profiles.find((profile) => profile.id === value) ?? null) : null;
  const effectiveValue = value;

  const options = useMemo(
    () =>
      profiles.map((profile) => ({
        value: profile.id,
        label: getProfileDisplayName(profile),
        searchText: profile.isDefault ? 'default' : profile.firemodeName,
      })),
    [profiles],
  );

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  return (
    <SearchableSelect
      value={effectiveValue}
      options={options}
      onChange={onSelectProfile}
      disabled={disabled}
      placeholder="Select profile"
      modalTitle="Fire mode profile"
      searchPlaceholder="Search profiles…"
      emptyMessage="No profiles match your search"
      style={style}
      renderValue={() =>
        selected ? (
          <ProfileLabel profile={selected} style={styles.triggerLabel} />
        ) : (
          <Text style={[styles.placeholder, { color: theme.colors.muted }]}>Select profile</Text>
        )
      }
      renderOption={(option, isSelected) => {
        const profile = profileById.get(option.value);
        if (!profile) {
          return (
            <Text
              style={{
                color: isSelected ? theme.colors.primaryForeground : theme.colors.foreground,
              }}
            >
              {option.label}
            </Text>
          );
        }

        return (
          <ProfileLabel
            profile={profile}
            nameStyle={{
              color: isSelected ? theme.colors.primaryForeground : theme.colors.foreground,
            }}
            defaultSuffixStyle={
              isSelected
                ? { color: theme.colors.primaryForeground, opacity: 0.85 }
                : undefined
            }
          />
        );
      }}
      headerActions={[
        {
          key: NEW_PROFILE_OPTION_VALUE,
          onPress: onRequestNewProfile,
          accessibilityLabel: 'New profile',
          render: () => (
            <MaterialIcons name="add" size={24} color={theme.colors.foreground} />
          ),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  triggerLabel: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 16,
  },
});
