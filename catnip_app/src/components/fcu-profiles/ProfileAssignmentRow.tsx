import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileDropdown } from '@/components/fcu-profiles/ProfileDropdown';
import type { FcuProfile, FcuProfileId } from '@/fcu-profiles';
import { useTheme } from '@/hooks/use-theme';

type ProfileAssignmentRowProps = {
  profiles: FcuProfile[];
  selectedProfileId: FcuProfileId | null;
  onSelectProfile: (profileId: FcuProfileId) => void;
  onRequestNewProfile: () => void;
  onPressEdit: () => void;
  onPressDelete: () => void;
  deleting?: boolean;
  disabled?: boolean;
};

export function ProfileAssignmentRow({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onRequestNewProfile,
  onPressEdit,
  onPressDelete,
  deleting = false,
  disabled = false,
}: ProfileAssignmentRowProps) {
  const { theme } = useTheme();

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const showActions =
    !disabled && selectedProfile !== null && !selectedProfile.isDefault;

  return (
    <View style={styles.wrapper}>
      <ProfileDropdown
        profiles={profiles}
        value={selectedProfileId}
        onSelectProfile={onSelectProfile}
        onRequestNewProfile={onRequestNewProfile}
        disabled={disabled}
        style={styles.dropdown}
      />
      {showActions ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onPressEdit}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={({ pressed }) => [
              styles.editButton,
              {
                borderColor: theme.colors.border,
                opacity: pressed || deleting ? 0.6 : 1,
              },
            ]}
          >
            <MaterialIcons name="edit" size={22} color={theme.colors.foreground} />
            <Text style={[styles.editLabel, { color: theme.colors.foreground }]}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={onPressDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete profile"
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || deleting ? 0.6 : 1,
              },
            ]}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <>
                <MaterialIcons
                  name="delete"
                  size={22}
                  color={theme.colors.primaryForeground}
                />
                <Text style={[styles.deleteLabel, { color: theme.colors.primaryForeground }]}>
                  Delete
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdown: {
    flex: 0,
    width: '100%',
    maxWidth: 360,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 360,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    flex: 1,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    flex: 1,
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
