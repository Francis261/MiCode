import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '@/constants/theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={styles.wrap}>
    <Image source={require('../assets/micode-logo.png')} style={compact ? styles.compactMark : styles.mark} resizeMode="cover" />
    {!compact && <Text style={styles.name}>MiCode</Text>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#030817' },
  compactMark: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#030817' },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -.7, color: colors.text },
});
