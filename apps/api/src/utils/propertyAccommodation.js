const ACCOMMODATION_GENDERS = ['female', 'male', 'both'];

function parseAccommodationFields(data) {
  const accommodation_gender = String(data.accommodation_gender || '').trim().toLowerCase();
  if (!ACCOMMODATION_GENDERS.includes(accommodation_gender)) {
    throw {
      status: 400,
      message: 'Select whether the listing is for female students, male students, or both.',
    };
  }

  const totalRooms = parseInt(data.total_rooms, 10);
  if (!Number.isFinite(totalRooms) || totalRooms < 1) {
    throw { status: 400, message: 'total_rooms must be at least 1' };
  }

  let female_rooms_available = null;
  let male_rooms_available = null;

  if (accommodation_gender === 'female') {
    female_rooms_available = totalRooms;
    male_rooms_available = 0;
  } else if (accommodation_gender === 'male') {
    male_rooms_available = totalRooms;
    female_rooms_available = 0;
  } else {
    female_rooms_available = parseInt(data.female_rooms_available, 10);
    male_rooms_available = parseInt(data.male_rooms_available, 10);
    if (!Number.isFinite(female_rooms_available) || female_rooms_available < 0) {
      throw {
        status: 400,
        message: 'Enter how many rooms are available for female students.',
      };
    }
    if (!Number.isFinite(male_rooms_available) || male_rooms_available < 0) {
      throw {
        status: 400,
        message: 'Enter how many rooms are available for male students.',
      };
    }
    if (female_rooms_available + male_rooms_available < 1) {
      throw {
        status: 400,
        message: 'At least one room must be available for female or male students.',
      };
    }
    if (female_rooms_available + male_rooms_available !== totalRooms) {
      throw {
        status: 400,
        message: 'Female and male room counts must add up to the total number of rooms.',
      };
    }
  }

  return {
    accommodation_gender,
    female_rooms_available,
    male_rooms_available,
  };
}

module.exports = {
  ACCOMMODATION_GENDERS,
  parseAccommodationFields,
};
