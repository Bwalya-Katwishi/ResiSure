export const ACCOMMODATION_OPTIONS = [
  { value: 'female', label: 'Female students only' },
  { value: 'male', label: 'Male students only' },
  { value: 'both', label: 'Female and male students' },
];

export function accommodationLabel(gender) {
  if (gender === 'female') return 'Female students only';
  if (gender === 'male') return 'Male students only';
  if (gender === 'both') return 'Female & male students';
  return 'Not specified';
}

export function accommodationAvailabilityText(property) {
  if (!property) return '';
  if (property.accommodation_gender === 'female') {
    return `${property.available_rooms} room(s) for female students`;
  }
  if (property.accommodation_gender === 'male') {
    return `${property.available_rooms} room(s) for male students`;
  }
  if (property.accommodation_gender === 'both') {
    const f = property.female_rooms_available;
    const m = property.male_rooms_available;
    if (f != null && m != null) {
      return `${f} for female · ${m} for male`;
    }
    return `${property.available_rooms} room(s) total`;
  }
  return `${property.available_rooms} of ${property.total_rooms} available`;
}

export function validateListingAccommodation(form) {
  const gender = String(form.accommodation_gender || '').trim();
  if (!gender) return 'Select who this listing is for (female, male, or both).';
  const total = Number(form.total_rooms);
  if (gender === 'both') {
    const f = parseInt(form.female_rooms_available, 10);
    const m = parseInt(form.male_rooms_available, 10);
    if (!Number.isFinite(f) || f < 0) return 'Enter rooms available for female students.';
    if (!Number.isFinite(m) || m < 0) return 'Enter rooms available for male students.';
    if (f + m < 1) return 'At least one room must be available.';
    if (Number.isFinite(total) && f + m !== total) {
      return 'Female and male room counts must add up to the total number of rooms.';
    }
  }
  return null;
}
