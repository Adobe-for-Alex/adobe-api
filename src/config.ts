export type Config = {
  seleniumServer: URL,
  placeCountNotification?: {
    freq: string,
    consumers: URL[]
  }
}

export const loadConfig = (): Config => {
  const {
    SELENIUM_SERVER,
    PLACE_COUNT_NOTIFICATIONS_FREQ,
    PLACE_COUNT_NOTIFICATIONS_URLS
  } = process.env
  if (!SELENIUM_SERVER) throw new Error('SELENIUM_SERVER is undefined')
  const optionalPart: Partial<Config> = PLACE_COUNT_NOTIFICATIONS_FREQ
    ? {
      placeCountNotification: {
        freq: PLACE_COUNT_NOTIFICATIONS_FREQ,
        consumers: (PLACE_COUNT_NOTIFICATIONS_URLS || '').split(';').map(x => new URL(x))
      }
    }
    : {}
  return {
    seleniumServer: new URL(SELENIUM_SERVER),
    ...optionalPart
  }
}
