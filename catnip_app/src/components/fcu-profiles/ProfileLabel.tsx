import { StyleSheet, Text, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { getProfileDisplayName, type FcuProfile } from '@/fcu-profiles';

type ProfileLabelProps = {
  profile: FcuProfile;
  style?: TextStyle;
  nameStyle?: TextStyle;
  defaultSuffixStyle?: TextStyle;
};

export function ProfileLabel({
  profile,
  style,
  nameStyle,
  defaultSuffixStyle,
}: ProfileLabelProps) {
  const { theme } = useTheme();
  const name = getProfileDisplayName(profile);

  if (!profile.isDefault) {
    return (
      <Text style={[styles.name, { color: theme.colors.foreground }, style, nameStyle]}>
        {name}
      </Text>
    );
  }

  return (
    <Text style={[styles.row, style]}>
      <Text style={[styles.name, { color: theme.colors.foreground }, nameStyle]}>{name} </Text>
      <Text
        style={[
          styles.defaultSuffix,
          { color: theme.colors.muted },
          defaultSuffixStyle,
        ]}
      >
        (default)
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  defaultSuffix: {
    fontSize: 13,
    fontWeight: '400',
  },
});
