const date_data_becomes_available_mm_dd = {
  FALL_QUARTER: "02-16",
  WINTER_QUARTER: "05-16",
  SPRING_QUARTER: "08-31",
  SUMMER_QUARTER: "10-25",
};

export function getDataExpirationDate() {
  const today = new Date();
  let smallestDifference = Infinity;
  let dataNextAvailableDate = new Date();
  for (const quarter in date_data_becomes_available_mm_dd) {
    const [month, day] = date_data_becomes_available_mm_dd[quarter].split("-");
    // If the date has already passed this year, use next year
    const dataAvailabilityDate = new Date(today.getFullYear(), month - 1, day);
    if (
      today.getMonth() + 1 > month ||
      (today.getMonth() == month && today.getDate() > day)
    ) {
      dataAvailabilityDate.setFullYear(today.getFullYear() + 1);
    }
    const difference = dataAvailabilityDate - today;
    if (difference > 0 && difference < smallestDifference) {
      smallestDifference = difference;
      dataNextAvailableDate = dataAvailabilityDate;
    }
  }
  return dataNextAvailableDate.toISOString();
}
