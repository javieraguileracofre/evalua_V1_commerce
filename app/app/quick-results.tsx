import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts
} from "@expo-google-fonts/plus-jakarta-sans";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { formatCurrencyCl, formatIntegerCl } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

type InventoryLite = {
  id: string;
  name: string;
  stock: number;
  cost: number;
};

type SaleLite = {
  id: string;
  inventory_item_id: string;
  sale_price: number;
  created_at: string;
};

type ChartPoint = { label: string; value: number };

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shortMonthLabel(date: Date) {
  return date.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDayLabel(date: Date) {
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

function BarChart({
  title,
  subtitle,
  points
}: {
  title: string;
  subtitle: string;
  points: ChartPoint[];
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <Card>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      <View style={styles.chartRows}>
        {points.map((point) => {
          const pct = Math.max(6, (point.value / max) * 100);
          return (
            <View key={point.label} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{point.label}</Text>
              <View style={styles.chartTrack}>
                <View style={[styles.chartBar, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.chartValue}>{formatCurrencyCl(point.value)}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default function QuickResultsScreen() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold
  });
  const font = fontsLoaded
    ? {
        regular: "PlusJakartaSans_400Regular" as const,
        semi: "PlusJakartaSans_600SemiBold" as const,
        bold: "PlusJakartaSans_700Bold" as const
      }
    : { regular: undefined, semi: undefined, bold: undefined };

  const [inventory, setInventory] = useState<InventoryLite[]>([]);
  const [sales, setSales] = useState<SaleLite[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [inventoryRes, salesRes] = await Promise.all([
      supabase.from("inventory_items").select("id,name,stock,cost"),
      supabase.from("sales_posts").select("id,inventory_item_id,sale_price,created_at").eq("status", "published")
    ]);

    if (inventoryRes.error) return Alert.alert("Error", inventoryRes.error.message);
    if (salesRes.error) return Alert.alert("Error", salesRes.error.message);

    setInventory((inventoryRes.data as InventoryLite[]) ?? []);
    setSales((salesRes.data as SaleLite[]) ?? []);
  }

  const { ventasTotal, comprasTotal, resultado, stockDisponible, monthlyAccumulated, dailyAccumulated } = useMemo(() => {
    const ventas = sales.reduce((acc, s) => acc + Number(s.sale_price ?? 0), 0);
    const compras = inventory.reduce((acc, item) => acc + Number(item.stock ?? 0) * Number(item.cost ?? 0), 0);
    const stock = inventory.reduce((acc, item) => acc + Number(item.stock ?? 0), 0);

    const now = new Date();

    const monthDates: Date[] = [];
    for (let i = 11; i >= 0; i--) {
      monthDates.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    const monthlyMap = new Map<string, number>();
    for (const d of monthDates) monthlyMap.set(monthKey(d), 0);

    for (const sale of sales) {
      const d = new Date(sale.created_at);
      const key = monthKey(d);
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(sale.sale_price ?? 0));
      }
    }

    const monthlyPoints: ChartPoint[] = [];
    let runningMonth = 0;
    for (const d of monthDates) {
      const key = monthKey(d);
      runningMonth += monthlyMap.get(key) ?? 0;
      monthlyPoints.push({ label: shortMonthLabel(d), value: runningMonth });
    }

    const dayDates: Date[] = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      dayDates.push(d);
    }
    const dailyMap = new Map<string, number>();
    for (const d of dayDates) dailyMap.set(dayKey(d), 0);

    for (const sale of sales) {
      const d = new Date(sale.created_at);
      d.setHours(0, 0, 0, 0);
      const key = dayKey(d);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(sale.sale_price ?? 0));
      }
    }

    const dailyPoints: ChartPoint[] = [];
    let runningDay = 0;
    for (const d of dayDates) {
      const key = dayKey(d);
      runningDay += dailyMap.get(key) ?? 0;
      dailyPoints.push({ label: shortDayLabel(d), value: runningDay });
    }

    return {
      ventasTotal: ventas,
      comprasTotal: compras,
      resultado: ventas - compras,
      stockDisponible: stock,
      monthlyAccumulated: monthlyPoints,
      dailyAccumulated: dailyPoints
    };
  }, [inventory, sales]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.headerRow}>
            <Link style={[styles.backLink, { fontFamily: font.bold }]} href="/">
              Volver al inicio
            </Link>
            <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>Resultados rapidos</Text>
          </View>
        </Card>

        <View style={styles.kpiGrid}>
          <Card>
            <Text style={[styles.kpiLabel, { fontFamily: font.semi }]}>Ventas</Text>
            <Text style={[styles.kpiValue, { fontFamily: font.bold }]}>{formatCurrencyCl(ventasTotal)}</Text>
          </Card>
          <Card>
            <Text style={[styles.kpiLabel, { fontFamily: font.semi }]}>Compras</Text>
            <Text style={[styles.kpiValue, { fontFamily: font.bold }]}>{formatCurrencyCl(comprasTotal)}</Text>
          </Card>
          <Card>
            <Text style={[styles.kpiLabel, { fontFamily: font.semi }]}>Resultado</Text>
            <Text
              style={[
                styles.kpiValue,
                { fontFamily: font.bold },
                resultado >= 0 ? styles.positive : styles.negative
              ]}
            >
              {formatCurrencyCl(resultado)}
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold }]}>Resumen de stock disponible</Text>
          <Text style={[styles.stockValue, { fontFamily: font.bold }]}>{formatIntegerCl(stockDisponible)} unidades</Text>
          <Text style={[styles.stockMeta, { fontFamily: font.regular }]}>
            {formatIntegerCl(inventory.length)} productos cargados en inventario.
          </Text>
        </Card>

        <BarChart
          title="Acumulado de ventas mensuales"
          subtitle="Acumulado de los ultimos 12 meses"
          points={monthlyAccumulated}
        />

        <BarChart
          title="Acumulado de ventas ultimos 10 dias"
          subtitle="Acumulado diario en la ventana reciente"
          points={dailyAccumulated}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  backLink: { color: theme.colors.secondary, fontWeight: "700" },
  headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiLabel: { color: theme.colors.muted, fontSize: 13, marginBottom: 6 },
  kpiValue: { color: theme.colors.text, fontSize: 22, fontWeight: "700" },
  positive: { color: theme.colors.success },
  negative: { color: theme.colors.danger },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "700", marginBottom: 8 },
  stockValue: { color: theme.colors.secondary, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  stockMeta: { color: theme.colors.muted, fontSize: 13 },
  chartTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  chartSubtitle: { color: theme.colors.muted, fontSize: 12, marginBottom: 12 },
  chartRows: { gap: 10 },
  chartRow: { gap: 4 },
  chartLabel: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  chartTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    overflow: "hidden"
  },
  chartBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary
  },
  chartValue: { color: theme.colors.secondary, fontSize: 12, fontWeight: "700" }
});
