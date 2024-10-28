const date_data_becomes_available_mm_dd = {
  FALL_QUARTER: "02-15",
  WINTER_QUARTER: "05-15",
  SPRING_QUARTER: "08-30",
  SUMMER_QUARTER: "10-24",
};

export function getDataExpirationDate() {
  const today = new Date();
  let smallestDifference = Infinity;
  let dataNextAvailableDate = new Date();
  for (const quarter in date_data_becomes_available_mm_dd) {
    const [month, day] = date_data_becomes_available_mm_dd[quarter].split("-");
    const dataAvailabilityDate = new Date(today.getFullYear(), month, day);
    const difference = dataAvailabilityDate - today;
    if (difference > 0 && difference < smallestDifference) {
      smallestDifference = difference;
      dataNextAvailableDate = dataAvailabilityDate;
    }
  }
  return dataNextAvailableDate.getTime();
}
