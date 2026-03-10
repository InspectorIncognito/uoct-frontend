export function get_datetime_format(datetime: Date): string {
  // Format a Date as DD/MM/YYYY HH:mm:ss in UTC — replaces moment.utc().format()
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(datetime.getUTCDate());
  const month = pad(datetime.getUTCMonth() + 1);
  const year = datetime.getUTCFullYear();
  const hours = pad(datetime.getUTCHours());
  const minutes = pad(datetime.getUTCMinutes());
  const seconds = pad(datetime.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
