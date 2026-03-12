import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';

export default function App() {
  const [debugLog, setDebugLog] = useState("Esperando orden...");
  const [loading, setLoading] = useState(false);

  const probarInternetGeneral = async () => {
    try {
      setLoading(true);
      setDebugLog("Probando conexión a Google/Internet...");
      
      // Intentamos conectar a un servidor que NUNCA falla
      const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const json = await response.json();

      // Si llegamos aquí, el celular SÍ tiene internet
      setDebugLog("✅ INTERNET OK: Recibido '" + json.title.substring(0, 10) + "...'");
    } catch (error: any) {
      // Si cae aquí, el problema es el Wi-Fi o el Celular
      setDebugLog("❌ FALLA TOTAL: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Diagnóstico FestQuest</Text>
      
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF6600" />
        ) : (
          <Text style={styles.logText}>{debugLog}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.btn} onPress={probarInternetGeneral}>
        <Text style={styles.btnText}>PROBAR INTERNET</Text>
      </TouchableOpacity>

      <Text style={styles.instruccion}>
        Si sale "INTERNET OK", el problema es Render. {"\n"}
        Si sale "FALLA TOTAL", el problema es tu Wi-Fi.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' },
  header: { color: '#FFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#1A1A1A', padding: 30, borderRadius: 20, alignItems: 'center', minHeight: 150, justifyContent: 'center' },
  logText: { color: '#00FF00', textAlign: 'center', fontSize: 16, fontWeight: '500' },
  btn: { marginTop: 30, backgroundColor: '#FF6600', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  instruccion: { color: '#666', marginTop: 40, textAlign: 'center', fontSize: 12, lineHeight: 18 }
});