import { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { theme } from "@/theme";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing(2), backgroundColor: theme.colors.background }
});
