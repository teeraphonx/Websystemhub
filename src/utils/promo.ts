const PROMO_SUPPRESSION_KEY = 'systemhub-promo-suppressed-until';
const ONE_HOUR_MS = 60 * 60 * 1000;

const readSuppressedUntil = () => {
  try {
    const rawValue = window.localStorage.getItem(PROMO_SUPPRESSION_KEY);

    if (!rawValue) {
      return 0;
    }

    const timestamp = Number(rawValue);

    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      window.localStorage.removeItem(PROMO_SUPPRESSION_KEY);
      return 0;
    }

    return timestamp;
  } catch {
    return 0;
  }
};

export const isPromoPopupSuppressed = () => readSuppressedUntil() > Date.now();

export const suppressPromoPopupForOneHour = () => {
  try {
    window.localStorage.setItem(
      PROMO_SUPPRESSION_KEY,
      String(Date.now() + ONE_HOUR_MS),
    );
  } catch {
    // Ignore storage failures and fall back to session-only behavior.
  }
};

export const clearPromoPopupSuppression = () => {
  try {
    window.localStorage.removeItem(PROMO_SUPPRESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
};
