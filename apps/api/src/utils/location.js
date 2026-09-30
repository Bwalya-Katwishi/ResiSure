function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
  );
}

function buildGoogleMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function stripPropertyLocation(property) {
  if (!property) return property;
  const cleaned = { ...property };
  delete cleaned.latitude;
  delete cleaned.longitude;
  return cleaned;
}

function canStudentSeeBookingLocation(booking) {
  if (!booking?.move_in_date || !booking?.escrow_held_at) return false;
  return !['pending', 'accepted', 'rejected', 'cancelled'].includes(booking.status);
}

function attachBookingLocation(booking, { includeForLandlord = false } = {}) {
  if (!booking) return booking;

  const hasCoords = booking.property_latitude != null && booking.property_longitude != null;
  const studentCanSee = canStudentSeeBookingLocation(booking);
  const shouldAttach = hasCoords && (studentCanSee || includeForLandlord);

  if (shouldAttach) {
    booking.property_location = {
      latitude: Number(booking.property_latitude),
      longitude: Number(booking.property_longitude),
      maps_url: buildGoogleMapsUrl(booking.property_latitude, booking.property_longitude),
    };
  }

  delete booking.property_latitude;
  delete booking.property_longitude;
  return booking;
}

module.exports = {
  isValidCoordinate,
  buildGoogleMapsUrl,
  stripPropertyLocation,
  canStudentSeeBookingLocation,
  attachBookingLocation,
};
