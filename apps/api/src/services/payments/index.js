/**
 * Payment provider factory.
 *
 * PAYMENT_PROVIDER=
 *   mock         — demo / academic demonstration (default in tests)
 *   auto         — route by phone prefix when live credentials exist; otherwise mock (dev only)
 *   mtn_momo     — force MTN MoMo Collection
 *   airtel_money — force Airtel Money Collection
 *   zamtel_kwacha — force Zamtel Kwacha (merchant URL required)
 *
 * Live providers call real collection APIs. They never invent a successful debit.
 */

const MockPaymentProvider = require('./mock.provider');
const MtnMomoProvider = require('./mtn.provider');
const AirtelMoneyProvider = require('./airtel.provider');
const ZamtelKwachaProvider = require('./zamtel.provider');
const { detectNetwork, networkLabel } = require('./phone');

const providers = {
  mock: MockPaymentProvider,
  mtn_momo: MtnMomoProvider,
  airtel_money: AirtelMoneyProvider,
  zamtel_kwacha: ZamtelKwachaProvider,
};

const LIVE_PROVIDER_IDS = ['mtn_momo', 'airtel_money', 'zamtel_kwacha'];

function configuredLive() {
  return {
    mtn_momo: MtnMomoProvider.configured(),
    airtel_money: AirtelMoneyProvider.configured(),
    zamtel_kwacha: ZamtelKwachaProvider.configured(),
  };
}

function requestedName() {
  return (process.env.PAYMENT_PROVIDER || 'auto').toLowerCase();
}

function assertMockAllowed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
    throw { status: 503, message: 'Mock payments are disabled in production.' };
  }
}

function resolveProviderName(phone, forcedProvider) {
  if (process.env.NODE_ENV === 'test') return 'mock';

  const requested = forcedProvider || requestedName();
  const live = configuredLive();

  if (requested === 'mock') {
    assertMockAllowed();
    return 'mock';
  }

  if (LIVE_PROVIDER_IDS.includes(requested)) {
    if (!live[requested]) {
      throw {
        status: 503,
        message: `${networkLabel(requested)} credentials are missing. Keep PAYMENT_PROVIDER=mock until they are set.`,
      };
    }
    const network = detectNetwork(phone);
    const expectedNetwork = requested === 'zamtel_kwacha' ? 'zamtel' : requested;
    if (network && network !== expectedNetwork && network !== 'zamtel' && requested !== 'zamtel_kwacha') {
      if (!(requested === 'mtn_momo' && network === 'mtn_momo') && !(requested === 'airtel_money' && network === 'airtel_money')) {
        throw {
          status: 400,
          message: `That number is ${networkLabel(network)}. PAYMENT_PROVIDER is ${networkLabel(requested)}.`,
        };
      }
    }
    return requested;
  }

  if (!live.mtn_momo && !live.airtel_money && !live.zamtel_kwacha) {
    assertMockAllowed();
    return 'mock';
  }

  const network = detectNetwork(phone);
  if (network === 'mtn_momo' && live.mtn_momo) return 'mtn_momo';
  if (network === 'airtel_money' && live.airtel_money) return 'airtel_money';
  if (network === 'zamtel' && live.zamtel_kwacha) return 'zamtel_kwacha';

  if (network === 'mtn_momo' && !live.mtn_momo) {
    throw { status: 503, message: 'This is an MTN number, but MTN MoMo is not configured.' };
  }
  if (network === 'airtel_money' && !live.airtel_money) {
    throw { status: 503, message: 'This is an Airtel number, but Airtel Money is not configured.' };
  }
  if (network === 'zamtel' && !live.zamtel_kwacha) {
    throw {
      status: 503,
      message: 'This is a Zamtel number, but Zamtel Kwacha is not configured. Pay with MTN (096/076) or Airtel (097/077), or contact support.',
    };
  }

  throw {
    status: 400,
    message: 'Enter a valid Zambian mobile number (MTN 096/076, Airtel 097/077, Zamtel 095/075).',
  };
}

function getPaymentProvider(phone, forcedProvider) {
  const name = resolveProviderName(phone, forcedProvider);
  return providers[name];
}

function describeMethods() {
  const live = configuredLive();
  const anyLive = live.mtn_momo || live.airtel_money || live.zamtel_kwacha;
  const requested = requestedName();
  const mode = process.env.NODE_ENV === 'test' || requested === 'mock' || !anyLive ? 'mock' : 'live';
  return {
    mode,
    provider: requested,
    demo: mode === 'mock',
    networks: [
      {
        id: 'mtn_momo',
        label: 'MTN MoMo',
        prefixes: ['096', '076'],
        configured: live.mtn_momo,
        ready: live.mtn_momo,
      },
      {
        id: 'airtel_money',
        label: 'Airtel Money',
        prefixes: ['097', '077'],
        configured: live.airtel_money,
        ready: live.airtel_money,
      },
      {
        id: 'zamtel_kwacha',
        label: 'Zamtel Kwacha',
        prefixes: ['095', '075'],
        configured: live.zamtel_kwacha,
        ready: live.zamtel_kwacha,
        note: live.zamtel_kwacha
          ? null
          : 'Requires merchant credentials and ZAMTEL_COLLECTION_URL from Zamtel commercial onboarding.',
      },
    ],
  };
}

module.exports = {
  getPaymentProvider,
  providers,
  describeMethods,
  resolveProviderName,
  configuredLive,
  LIVE_PROVIDER_IDS,
};
