/** ResiSure brand palette — matches logo (#0047AB primary, #4DA6FF accent) */
export const brand = {
  primary: '#0047AB',
  accent: '#4DA6FF',
  dark: '#003580',
  light: '#eef4fc',
};

export const colors = {
  bg: '#f8fafc',
  card: '#fff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  blue: brand.primary,
  accent: brand.accent,
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
};

export const shared = {
  list: { padding: 16, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  price: { color: colors.blue, fontWeight: '800', marginTop: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    color: '#166534',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
};

export function money(value) {
  return `ZMW ${Number(value || 0).toLocaleString()}`;
}
