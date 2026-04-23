const intFormatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

export function formatIntegerCl(value: number) {
  return intFormatter.format(value);
}

export function formatCurrencyCl(value: number) {
  return currencyFormatter.format(value);
}
