import { StatusBar, StyleSheet, Text, View } from 'react-native';

export default function PerfilScreen() {
  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0c0c" />
      <Text style={s.soon}>👤</Text>
      <Text style={s.label}>Perfil</Text>
      <Text style={s.sub}>Próximamente</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0c0c0c', alignItems: 'center', justifyContent: 'center', gap: 8 },
  soon:   { fontSize: 48 },
  label:  { fontFamily: 'Outfit_700Bold', fontSize: 20, fontWeight: '700', color: '#fff' },
  sub:    { fontSize: 13, color: '#555' },
});
