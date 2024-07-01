export function getDayType(day: number) {
  return day === 7 ? "D" : day === 6 ? "S" : "L";
}

export function getDayTypeIndex(dayType: string) {
  const dayTypes = ["L", "S", "D"];
  return dayTypes.indexOf(dayType);
}
