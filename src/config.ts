export type Config = {
  seleniumServer: URL,
  placeCountNotification?: {
    freq: string,
    consumers: URL[]
  },
  proxy: {
    list: URL,
    test: {
      url: URL,
      timeout: number
    }
  }
}

export const loadConfig = (): Config => {
  const {
    SELENIUM_SERVER,
    PLACE_COUNT_NOTIFICATIONS_FREQ,
    PLACE_COUNT_NOTIFICATIONS_URLS,
    PROXY_LIST_URL,
    PROXY_TEST_URL,
    PROXY_TEST_TIMEOUT
  } = process.env
  if (!SELENIUM_SERVER) throw new Error('SELENIUM_SERVER is undefined')
  if (!PROXY_LIST_URL) throw new Error('PROXY_LIST_URL is undefined')
  if (!PROXY_TEST_URL) throw new Error('PROXY_TEST_URL is undefined')
  if (!PROXY_TEST_TIMEOUT) throw new Error('PROXY_TEST_TIMEOUT is undefined')
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
    proxy: {
      list: new URL(PROXY_LIST_URL),
      test: {
        url: new URL(PROXY_TEST_URL),
        timeout: Number.parseInt(PROXY_TEST_TIMEOUT)
      }
    },
    ...optionalPart
  }
}
