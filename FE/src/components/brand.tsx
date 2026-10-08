import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

export function Brand() {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>₹</Text>
      </View>
      <View>
        <Text style={styles.name}>TrackRupee</Text>
        <Text style={styles.tagline}>MONEY MADE CLEAR</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: radii.brand,
    borderBottomLeftRadius: radii.brand,
    backgroundColor: colors.primary,
  },
  markText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 34,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
});
