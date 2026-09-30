const USER_ROLES = ['student', 'landlord', 'admin'];
const REGISTER_ROLES = ['student', 'landlord'];

const ROLE_DASHBOARDS = {
  student: '/dashboard/student',
  landlord: '/dashboard/landlord',
  admin: '/dashboard/admin',
};

function getDashboardPath(role) {
  return ROLE_DASHBOARDS[role] || '/';
}

module.exports = { USER_ROLES, REGISTER_ROLES, ROLE_DASHBOARDS, getDashboardPath };
