const date_data_becomes_available_mm_dd = {
  FALL_QUARTER: "01-12",
  WINTER_QUARTER: "04-10",
  SPRING_QUARTER: "07-01",
  SUMMER_QUARTER: "09-25",
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
