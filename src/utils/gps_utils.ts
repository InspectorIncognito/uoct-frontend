import moment from "moment";

export function get_datetime_format(datetime: Date) {
  return moment.utc(datetime).format("DD/MM/YYYY hh:mm:ss");
}
